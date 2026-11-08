/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the actual navigation components with the existing compiler. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { Dialog } = require("@base-ui/react/dialog");
require("next/link");
require("next/image");
const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
let state = [], refs = [], effects = [], cursor = 0, refCursor = 0, headerVisible = true;
const hooks = {
  ...React,
  useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value; }]; },
  useRef(initial) { return refs[refCursor++] ??= { current: initial }; },
  useEffect(effect) { effects.push(effect); },
};
Module._load = function(request, parent, isMain) {
  if (request === "react" && [path.join(root, "components"), path.join(root, "app")].some(prefix => parent?.filename.startsWith(prefix))) return hooks;
  if (request === "@/hooks/useAutoHideTopBar") return { useAutoHideTopBar: () => headerVisible };
  if (request === "next/navigation") return { useRouter: () => ({ push() {} }) };
  if (request.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  return originalLoad.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, isMain);
};
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
function find(node, predicate) { if (!node || typeof node !== "object") return null; if (predicate(node)) return node; for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; } return null; }
function render(Component, props = {}) { cursor = 0; refCursor = 0; effects = []; return Component(props); }
function reset() { state = []; refs = []; effects = []; }

const animations = [], observers = [];
class Element {
  constructor(id, direction, order = 0) { this.id = id; this.dataset = direction ? { landingReveal: direction, revealOrder: String(order) } : {}; this.scrolls = []; }
  getBoundingClientRect() { return { top: this.id === "home" ? 0 : 1200 }; }
  setAttribute(name, value) { this[name] = value; }
  getAttribute(name) { return this[name]; }
  closest() { return this; }
  focus(options) { this.focusOptions = options; }
  scrollIntoView(options) { this.scrolls.push(options); }
  animate(frames, options) { const animation = { frames, options, paused: false, pause() { this.paused = true; }, play() { this.paused = false; }, cancel() { this.cancelled = true; } }; animations.push(animation); return animation; }
}
global.Element = global.HTMLElement = Element;
global.IntersectionObserver = class {
  constructor(callback, options) { this.callback = callback; this.options = options; this.observed = []; observers.push(this); }
  observe(element) { this.observed.push(element); }
  unobserve(element) { this.observed = this.observed.filter(value => value !== element); }
  disconnect() { this.disconnected = true; }
};
const reduced = { matches: false, addEventListener(_, callback) { this.listener = callback; }, removeEventListener() { this.listener = null; } };
const desktop = { ...reduced };
const sections = Object.fromEntries(["home", "features", "how-it-works", "main-content"].map(id => [id, new Element(id)]));
const reveals = ["left", "right", "down"].map((direction, i) => new Element("reveal-" + i, direction, i));
global.document = { getElementById: id => sections[id] };
global.window = {
  innerHeight: 800, location: { hash: "" }, addEventListener() {}, removeEventListener() {},
  matchMedia: query => query.includes("reduced-motion") ? reduced : desktop,
  history: { pushState(_, title, hash) { window.location.hash = hash; } },
};
function click(href, extra = {}) {
  const anchor = new Element(); anchor.href = href;
  return { target: anchor, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
}

const { LandingExperience } = require("../components/landing/LandingExperience.tsx");
let tree = render(LandingExperience, { children: null });
refs[0].current = { querySelectorAll: () => reveals };
const cleanup = effects.map(effect => effect());
assert.equal(animations.length, reveals.length, "prepare every reveal before it enters the viewport");
assert(animations.every(animation => animation.paused && animation.currentTime === 0 && animation.options.fill === "both"), "unseen elements must already be held at invisible frame zero");
assert.equal(find(tree, node => node.type === "header").props["data-hidden"], false);
headerVisible = false;
tree = render(LandingExperience);
assert.equal(find(tree, node => node.type === "header").props["data-hidden"], true);
headerVisible = true;
tree = render(LandingExperience);
assert.equal(find(tree, node => node.type === "header").props["data-hidden"], false);
const { resolveTopBarScroll } = require("../lib/top-bar-scroll.ts");
assert.equal(resolveTopBarScroll(20, 40).visible, false);
assert.equal(resolveTopBarScroll(40, 24).visible, true);
assert.equal(resolveTopBarScroll(0, 8).visible, true);

const nav = click("#features");
tree.props.onClick(nav);
assert(nav.defaultPrevented);
assert.equal(window.location.hash, "#features");
assert.deepEqual(sections.features.scrolls.at(-1), { behavior: "smooth", block: "start" });
assert.deepEqual(sections.features.focusOptions, { preventScroll: true });
const modified = click("#features", { ctrlKey: true });
tree.props.onClick(modified);
assert.equal(modified.defaultPrevented, false);
const missing = click("#missing");
tree.props.onClick(missing);
assert.equal(missing.defaultPrevented, false);
reduced.matches = true;
tree.props.onClick(click("#how-it-works"));
assert.equal(sections["how-it-works"].scrolls.at(-1).behavior, "instant");
reduced.matches = false;

find(tree, node => node.type === Dialog.Root).props.onOpenChange(true);
tree = render(LandingExperience);
headerVisible = false;
tree = render(LandingExperience);
assert.equal(find(tree, node => node.type === "header").props["data-hidden"], false, "open drawer pins the header");
const scrollCount = sections.features.scrolls.length;
tree.props.onClick(click("#features"));
tree = render(LandingExperience);
assert.equal(find(tree, node => node.type === Dialog.Root).props.open, false);
assert.equal(sections.features.scrolls.length, scrollCount, "wait until drawer scroll lock is released");
find(tree, node => node.type === Dialog.Root).props.onOpenChangeComplete(false);
assert.equal(sections.features.scrolls.length, scrollCount + 1);
assert(find(tree, node => node.type === Dialog.Close && node.props["aria-label"] === "Close navigation"));
assert(find(tree, node => node.type === Dialog.Title));
find(tree, node => node.type === Dialog.Root).props.onOpenChange(true);
tree = render(LandingExperience);
effects[1]();
desktop.matches = true; desktop.listener();
tree = render(LandingExperience);
assert.equal(find(tree, node => node.type === Dialog.Root).props.open, false, "desktop resize closes the mobile drawer");

const revealObserver = observers.find(observer => observer.options?.threshold === 0.01);
revealObserver.callback([{ target: reveals[0], isIntersecting: false }]);
assert(animations.every(animation => animation.paused), "scrolling near a section must not show it before entry");
revealObserver.callback(reveals.map(target => ({ target, isIntersecting: true })));
assert.equal(animations.length, 3);
assert(animations.every(animation => !animation.paused), "entering the viewport starts the prepared animations");
assert.equal(animations[0].frames[0].transform, "translateX(-20px)");
assert.equal(animations[1].frames[0].transform, "translateX(20px)");
assert.equal(animations[2].frames[0].transform, "translateY(16px)");
assert.deepEqual(animations.map(animation => animation.options.delay), [0, 100, 200]);
assert(animations.every(animation => animation.frames[1].transform === "none" && animation.options.duration === 700));
revealObserver.callback([{ target: reveals[0], isIntersecting: true }]);
assert.equal(animations.length, 3, "each reveal runs once");
animations[0].onfinish();
assert(animations[0].cancelled, "completed entrances release their filled transform back to the page style");
reduced.matches = true; reduced.listener();
assert(animations.every(animation => animation.cancelled), "motion preference changes release animations");
cleanup.forEach(stop => stop?.());
assert.equal(reduced.listener, null);

reset();
const LoginPage = require("../app/(auth)/login/page.tsx").default;
assert.equal(render(LoginPage).props.backHref, "/");
assert.equal(render(LoginPage).props.backAtPageEdge, true);
const SignupPage = require("../app/(auth)/signup/page.tsx").default;
reset();
assert.equal(render(SignupPage).props.backHref, "/");
for (const step of [2, 3]) {
  state[1] = step;
  const signup = render(SignupPage);
  assert.equal(signup.props.backHref, undefined);
  signup.props.onBack();
  assert.equal(state[1], step - 1, "later signup back buttons stay inside the wizard");
}
const AuthShell = require("../components/auth/AuthShell.tsx").default;
const back = find(AuthShell({ children: null, backHref: "/", hideLogo: true }), node => node.props["aria-label"] === "Back to landing page");
assert.equal(back.props.href, "/");
assert.match(back.props.className, /h-11 w-11/);
assert.match(back.props.className, /focus-visible:ring-2/);
const loginShell = AuthShell({ children: null, backHref: "/", backAtPageEdge: true, hideLogo: true });
const loginBack = find(loginShell, node => node.props["aria-label"] === "Back to landing page");
assert.match(loginShell.props.className, /relative/);
assert.match(loginBack.props.className, /absolute left-4 top-4/);
assert.doesNotMatch(back.props.className, /absolute/, "signup back remains in its wizard column");

const css = fs.readFileSync(path.join(root, "components/landing/landing.module.css"), "utf8");
assert.match(css, /\.header \{[^}]*position: sticky;[^}]*transition: transform/);
assert.match(css, /\.desktopNav a \{[^}]*font-weight: 400/);
assert.match(css, /\.menuPanel \{[^}]*position: fixed;[^}]*right: 0/);
assert.match(css, /menuItemIn 240ms 80ms/);
assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.menuPanel[^}]*animation: none !important/);
console.log("PASS: header direction, smooth anchors, delayed drawer navigation, drawer semantics/resize, reveal directions/stagger/cleanup, reduced motion and auth back links.");
