/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the TSX with the installed compiler and no added test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
let manual = false, state = [], refs = [], effects = [], cursor = 0, refCursor = 0;
const hooks = {
  ...React,
  useState(initial) {
    if (!manual) return React.useState(initial);
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
  },
  useRef(initial) { if (!manual) return React.useRef(initial); return refs[refCursor++] ??= { current: initial }; },
  useEffect(effect, deps) { if (!manual) return React.useEffect(effect, deps); effects.push(effect); },
};
let animation, animationOptions;
const lottie = { loadAnimation(options) {
  animationOptions = options;
  const events = {};
  animation = { events, plays: 0, pauses: 0, destroyed: false,
    play() { this.plays++; }, pause() { this.pauses++; }, destroy() { this.destroyed = true; },
    addEventListener(name, callback) { events[name] = callback; },
  };
  return animation;
} };
Module._load = function(request, parent, isMain) {
  if (request === "react" && parent?.filename.startsWith(path.join(root, "components", "landing"))) return hooks;
  if (request === "lottie-web") return { __esModule: true, default: lottie };
  if (request === "next/font/google") return { Poppins: () => ({ variable: "poppins-test" }) };
  if (request === "@/components/ui/BackLink") return { AppHistoryTracker: () => null };
  if (request.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  if (request.endsWith(".css")) return {};
  return originalLoad.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, isMain);
};
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  fileName: filename,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);

function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; }
  return null;
}
function render(Component, props) { cursor = 0; refCursor = 0; effects = []; return Component(props); }
function reset() { state = []; refs = []; effects = []; cursor = 0; refCursor = 0; }
function flush() { return new Promise(resolve => setImmediate(resolve)); }

async function main() {
  const RootLayout = require("../app/layout.tsx").default;
  const rootLayout = RootLayout({ children: null });
  const { SIDEBAR_INIT_SCRIPT } = require("../lib/sidebar.ts");
  for (const stored of ["false", "true", null]) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(SIDEBAR_INIT_SCRIPT, { document, localStorage: { getItem: () => stored } });
    assert.equal(document.documentElement.dataset.sidebar, stored === "false" ? "expanded" : undefined);
  }
  assert.equal(rootLayout.props.suppressHydrationWarning, true, "only html must allow the intentional pre-hydration sidebar attribute");
  assert.equal(find(rootLayout, node => node.type === "body").props.suppressHydrationWarning, undefined);
  const Page = require("../app/page.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Page));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(target), "unresolved anchor " + target);
  for (const [, target] of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert(ids.includes(target), "unresolved label " + target);
  for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) assert(["/login", "/signup"].includes(href));
  assert.equal((html.match(/class="featureCard"/g) ?? []).length, 3);
  assert.equal((html.match(/class="stepCard"/g) ?? []).length, 3);
  assert.equal((html.match(/class="playbackButton"/g) ?? []).length, 1, "only the Home Lottie gets playback controls");
  assert(!html.includes("hero-preview.png"), "the Home Lottie must not load a placeholder image");
  assert.equal((html.match(/class="animationPoster"/g) ?? []).length, 1, "only the final CTA retains its poster");
  assert.match(html, /aria-label="Pause walkthrough"/);
  assert.equal((html.match(/title="Coming soon"/g) ?? []).length, 3, "About and policy remain mock buttons");
  assert.equal((html.match(/src="\/landing\/[^\"]+-still.webp"/g) ?? []).length, 6, "SSR loads light stills before animated assets");
  assert.match(html, /Review before confirming/);
  assert.match(html, /archive signed documents/);
  assert(!html.includes("www.figma.com"), "no expiring Figma asset URLs");
  const assets = new Set([...html.matchAll(/(?:src|srcSet)="(\/landing\/[^"]+)"/g)].map(match => match[1]));
  for (const asset of assets) assert(fs.statSync(path.join(root, "public", asset)).size > 0, asset);
  for (const file of ["hero-animation.json", "fina_CTA/animation.json"]) {
    const data = JSON.parse(fs.readFileSync(path.join(root, "public/landing", file)));
    assert(data.w > 0 && data.h > 0 && data.op > data.ip && data.layers.length);
    assert(!(data.assets ?? []).some(asset => asset.p && !asset.p.startsWith("data:")), "Lottie must be self contained");
  }
  const sharp = require("sharp");
  for (const directory of ["features", "how_it_work"]) {
    for (const name of fs.readdirSync(path.join(root, "public/landing", directory)).filter(name => name.endsWith(".gif"))) {
      const source = path.join(root, "public/landing", directory, name);
      const destination = source.replace(/\.gif$/, ".webp");
      const before = await sharp(source).metadata();
      const after = await sharp(destination, { animated: true, limitInputPixels: false }).metadata();
      assert.equal(before.pages, after.pages, "preserve every animation frame");
      assert.equal(before.delay.reduce((sum, value) => sum + value, 0), after.delay.reduce((sum, value) => sum + value, 0));
      assert(after.hasAlpha);
      assert(Math.abs(after.pageHeight - after.width * before.height / before.width) <= 1, "preserve illustration proportions within integer pixel rounding");
      assert(fs.statSync(destination).size < fs.statSync(source).size);
    }
  }
  manual = true;
  const { WorkflowCarousel } = require("../components/landing/WorkflowCarousel.tsx");
  reset();
  global.HTMLElement = class HTMLElement {};
  const cards = [0, 1, 2].map(index => Object.assign(new HTMLElement(), { offsetWidth: 260, offsetLeft: 24 + index * 276 }));
  const track = { firstElementChild: cards[0], children: cards, scrollLeft: 0, scrollTo(options) { this.scrollLeft = options.left; this.behavior = options.behavior; } };
  global.getComputedStyle = () => ({ columnGap: "16px", paddingLeft: "24px" });
  const preference = { matches: false, addEventListener() {}, removeEventListener() {} };
  global.window = { matchMedia: () => preference };
  let tree = render(WorkflowCarousel, { children: [] });
  refs[0].current = track;
  const step = index => find(tree, node => node.type === "button" && node.props["aria-label"].startsWith("Step " + index));
  step(3).props.onClick();
  assert.equal(track.scrollLeft, 552);
  find(tree, node => node.props.onScroll).props.onScroll();
  tree = render(WorkflowCarousel, { children: [] });
  assert.equal(step(3).props["aria-current"], "step");
  preference.matches = true;
  step(1).props.onClick();
  assert.equal(track.scrollLeft, 0);
  assert.equal(track.behavior, "instant");

  const { LandingAnimation } = require("../components/landing/LandingAnimation.tsx");
  for (const reduced of [false, true]) {
    reset();
    let observe, visibility, preferenceChange, disconnected = false;
    preference.matches = reduced;
    preference.addEventListener = (_, callback) => { preferenceChange = callback; };
    global.document = { hidden: false, addEventListener: (_, callback) => { visibility = callback; }, removeEventListener() {} };
    global.IntersectionObserver = class { constructor(callback) { observe = callback; } observe() {} disconnect() { disconnected = true; } };
    const props = { src: "/landing/hero-animation.json", label: "Walkthrough", controls: true };
    tree = render(LandingAnimation, props);
    refs[0].current = {};
    const cleanup = effects[0]();
    assert.equal(find(tree, node => node.type === "button").props.disabled, true);
    observe([{ isIntersecting: true }]);
    await flush();
    assert.equal(animationOptions.path, props.src);
    assert.equal(animationOptions.autoplay, false);
    assert.equal(animationOptions.loop, true, "the walkthrough loops while visible");
    animation.events.DOMLoaded();
    tree = render(LandingAnimation, props);
    let button = find(tree, node => node.type === "button");
    assert.equal(button.props.disabled, false);
    assert.equal(button.props["aria-pressed"], reduced);
    assert.equal(animation.plays > 0, !reduced, "respect initial reduced motion");
    if (reduced) {
      button.props.onClick();
      assert(animation.plays > 0, "explicit Play is allowed under reduced motion");
    }
    tree = render(LandingAnimation, props);
    find(tree, node => node.type === "button").props.onClick();
    const plays = animation.plays;
    global.document.hidden = true; visibility();
    global.document.hidden = false; visibility();
    assert.equal(animation.plays, plays, "visibility changes must preserve user pause");
    tree = render(LandingAnimation, props);
    find(tree, node => node.type === "button").props.onClick();
    const pauses = animation.pauses;
    const loadedAnimation = animation;
    animation.currentFrame = 400;
    observe([{ isIntersecting: false }]);
    assert(animation.pauses > pauses, "offscreen Lottie pauses");
    tree = render(LandingAnimation, props);
    assert.equal(tree.props["data-ready"], true, "scrolling away keeps the rendered frame instead of the placeholder");
    find(tree, node => node.type === "button").props.onClick();
    tree = render(LandingAnimation, props);
    const offscreenPlays = animation.plays;
    find(tree, node => node.type === "button").props.onClick();
    assert.equal(animation.plays, offscreenPlays, "manual Play cannot start an offscreen animation");
    observe([{ isIntersecting: true }]);
    assert(animation.plays > plays, "visible Lottie resumes");
    assert.equal(animation, loadedAnimation, "reuse the player on returning to view");
    assert.equal(animation.currentFrame, 400, "scrolling preserves the paused frame");
    preference.matches = true; preferenceChange();
    if (!reduced) {
      animation.events.data_failed();
      tree = render(LandingAnimation, props);
      assert.equal(tree.props["data-ready"], false);
      assert(find(tree, node => node.props.role === "status"), "load failure has readable guidance without an image placeholder");
      assert(!find(tree, node => node.props.className === "animationPoster"));
      assert.equal(find(tree, node => node.type === "button").props.disabled, true);
    }
    cleanup();
    assert(animation.destroyed && disconnected, "release animation and observers");
  }
  reset();
  tree = render(LandingAnimation, { src: "/landing/fina_CTA/animation.json", poster: "/landing/fina_CTA/poster.png", label: "CTA" });
  assert(!find(tree, node => node.type === "button"), "no extra playback button on final CTA");
  const { LandingIllustration } = require("../components/landing/LandingIllustration.tsx");
  reset();
  let illustrationVisibility, illustrationObserver, illustrationPreference, illustrationDisconnected = false;
  preference.matches = false;
  preference.addEventListener = (_, callback) => { illustrationPreference = callback; };
  global.document = { hidden: false, addEventListener: (_, callback) => { illustrationVisibility = callback; }, removeEventListener() {} };
  global.IntersectionObserver = class { constructor(callback) { illustrationObserver = callback; } observe() {} disconnect() { illustrationDisconnected = true; } };
  const illustrationProps = { src: "/landing/features/liquifi-receipt-character-gray.webp", width: 960, height: 752, className: "featureArt" };
  const image = () => find(tree, node => node.props.src);
  tree = render(LandingIllustration, illustrationProps);
  assert.match(image().props.src, /-still.webp$/);
  refs[0].current = {};
  const illustrationCleanup = effects[0]();
  illustrationObserver([{ isIntersecting: true }]);
  tree = render(LandingIllustration, illustrationProps);
  assert.equal(image().props.src, illustrationProps.src, "download animation only in view");
  global.document.hidden = true; illustrationVisibility();
  tree = render(LandingIllustration, illustrationProps);
  assert.match(image().props.src, /-still.webp$/);
  global.document.hidden = false; illustrationVisibility();
  preference.matches = true; illustrationPreference();
  tree = render(LandingIllustration, illustrationProps);
  assert.match(image().props.src, /-still.webp$/, "reduced motion uses a true still");
  preference.matches = false; illustrationPreference();
  tree = render(LandingIllustration, illustrationProps);
  image().props.onError();
  tree = render(LandingIllustration, illustrationProps);
  assert.match(image().props.src, /-still.webp$/, "failed animation returns to its still");
  illustrationCleanup();
  assert(illustrationDisconnected);
  console.log("PASS: landing server render, navigation, six exact animated assets, reduced motion, mock footer, carousel, hero-only controls, visibility and Lottie cleanup.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
