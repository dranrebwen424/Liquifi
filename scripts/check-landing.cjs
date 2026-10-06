/* eslint-disable @typescript-eslint/no-require-imports -- Run TSX with the installed compiler, no test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  return originalLoad.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, isMain);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}

async function main() {
  const Page = require("../app/page.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Page));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, "page IDs must be unique");
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, "one primary heading");
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(target), `anchor #${target} must resolve`);
  for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) assert(["/", "/login", "/signup"].includes(href), `unexpected destination ${href}`);
  for (const [, target] of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert(ids.includes(target), `section label ${target} must resolve`);
  assert.equal((html.match(/class="faqItem"/g) ?? []).length, 4, "questions remain native disclosures without JS");
  assert.match(html, /aria-label="Pause animations"/, "looping motion must have a pause control");
  assert.match(html, /data-motion-paused="false"/);
  assert(!html.includes('data-motion-ready="true"'), "SSR must not start ambient animation before preference checks");
  const numbers = [...html.matchAll(/class="numberTile">([^<]+)</g)].map((match) => match[1]);
  assert.equal(numbers.length, 7);
  assert(numbers.every((number) => /^\d+$/.test(number)), "floating tiles display only numbers");
  const { formatPHP } = require("../lib/format.ts");
  for (const value of [20000, 7500, 20000 - 7500]) assert(html.includes(formatPHP(value)), "preview totals must agree");
  assert.match(html, /Illustrative preview/, "sample figures must be identified as examples");
  assert.match(html, /Review the extracted receipt details before confirming/);
  assert.match(html, /After approval, download and print it for physical signing/);
  console.log("PASS: server render, navigation, accessible labels, no-JS content, numeric tiles, budget arithmetic and workflow copy.");

  if (process.argv.includes("--render")) {
    const sharp = require("sharp");
    const { LedgerIllustration } = require("../components/landing/LedgerIllustration.tsx");
    const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
    const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2]]));
    const directory = path.join(root, ".tmp/landing-art");
    fs.mkdirSync(directory, { recursive: true });
    for (const variant of ["hero", "receipt", "report"]) {
      let svg = renderToStaticMarkup(React.createElement(LedgerIllustration, { variant })).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
      for (let pass = 0; pass < 4; pass++) svg = svg.replace(/var\((--[\w-]+)\)/g, (_, token) => { assert(tokens[token], `missing token ${token}`); return tokens[token]; });
      await sharp(Buffer.from(svg)).resize(900).png().toFile(path.join(directory, `${variant}.png`));
    }
    console.log("PASS: all three SVG illustrations rendered to .tmp/landing-art.");
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
