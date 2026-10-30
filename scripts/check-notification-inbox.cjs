/* eslint-disable @typescript-eslint/no-require-imports -- Run the actual notification components without a new test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
const load = Module._load;
let state = [], refs = [], cursor = 0, refCursor = 0, pushes = [], refreshes = 0, reads = [], allReads = 0;
let markOne = async () => ({ success: true });
let markAll = async () => ({ success: true });
const router = { push: url => pushes.push(url), refresh: () => { refreshes++; } };
const mocks = {
  react: { ...React, useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value; }]; }, useRef(initial) { return refs[refCursor++] ??= { current: initial }; } },
  "next/navigation": { useRouter: () => router },
  "@/actions/notifications": { markNotificationRead: async id => { reads.push(id); return markOne(); }, markAllNotificationsRead: async () => { allReads++; return markAll(); } },
};
Module._load = function(request, parent, isMain) { if (mocks[request]) return mocks[request]; return load.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, isMain); };
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const { NotificationsList } = require("../components/notifications/NotificationsList.tsx");
const { NotificationHeader } = require("../components/notifications/NotificationHeader.tsx");
Date.now = () => Date.parse("2026-10-30T10:00:00Z");
const items = Array.from({ length: 25 }, (_, i) => ({ id: `n-${i}`, title: `Update ${i}`, body: `Council event ${i}`, type: ["report_approved", "report_rejected", "constructor"][i % 3], read: i !== 0 && i !== 14, created_at: i < 10 ? "2026-10-29T08:00:00Z" : "2026-09-15T08:00:00Z", url: `/treasurer/reports/event-${i}` }));
function reset() { state = []; refs = []; pushes = []; refreshes = 0; reads = []; allReads = 0; markOne = async () => ({ success: true }); markAll = async () => ({ success: true }); }
function render(data = items) { cursor = 0; refCursor = 0; return NotificationsList({ items: data, unreadCount: data.filter(row => !row.read).length }); }
function find(node, predicate) { if (!node || typeof node !== "object") return null; if (predicate(node)) return node; for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; } return null; }
function text(node) { if (typeof node === "string" || typeof node === "number") return String(node); return node ? React.Children.toArray(node.props?.children).map(text).join(" ") : ""; }
function button(tree, content) { return find(tree, n => n.type === "button" && text(n).trim() === content); }
function row(tree, title) { return find(tree, n => n.type === "button" && new RegExp(title + "(?:\\s|$)").test(text(n))); }
function html(data = items) { return renderToStaticMarkup(render(data)); }
async function main() {
  reset();
  let output = html();
  assert.match(output, /October 2026/);
  const inbox = render();
  assert.equal(inbox.props.className, "lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:shadow-card", "mobile inbox has no card shell");
  const chipGroup = find(inbox, n => n.props?.["aria-label"] === "Filter notifications");
  assert.equal(chipGroup.props.className, "flex items-center gap-2", "filter chips have no shared toggle background");
  assert.deepEqual(React.Children.toArray(chipGroup.props.children).map(chip => text(chip).trim()), ["All", "Unread"], "filter chips have no counts");
  assert.match(React.Children.toArray(chipGroup.props.children)[0].props.className, /rounded-xl border/);
  assert.match(output, /September 2026/);
  assert.match(output, /Showing 15 of 25 updates/, "all unread rows are initially exposed");
  assert.match(output, /text-xs leading-5 lg:text-sm/);
  assert.match(output, /text-\[11px\] leading-5/);
  assert.match(output, /Unread notification:/);
  assert.match(output, /<time dateTime=/i);
  button(render(), "See more").props.onClick();
  assert.match(html(), /Showing 25 of 25 updates/);
  const unreadFilter = find(render(), n => n.type === "button" && n.props["aria-pressed"] === false);
  unreadFilter.props.onClick();
  output = html();
  assert.match(output, /Showing 2 of 2 updates/);
  assert.doesNotMatch(output, /Council event 1<\/span>/);

  reset();
  let release;
  markOne = () => new Promise(resolve => { release = resolve; });
  let tree = render();
  const opening = row(tree, "Update 0").props.onClick();
  await row(tree, "Update 0").props.onClick();
  assert.equal(reads.length, 1, "duplicate opens are blocked synchronously");
  assert.equal(row(render(), "Update 0").props.disabled, true);
  release({ success: true });
  await opening;
  assert.deepEqual(pushes, ["/treasurer/reports/event-0"]);
  assert.equal(refreshes, 1);
  await row(render(), "Update 1").props.onClick();
  assert.equal(reads.length, 1, "already read rows do not write again");
  assert.equal(pushes.at(-1), "/treasurer/reports/event-1");

  reset();
  markOne = async () => ({ success: false });
  await row(render(), "Update 0").props.onClick();
  assert.equal(pushes.length, 0, "failed mark-as-read does not pretend to navigate successfully");
  assert.match(html(), /role="alert"/);
  assert.equal(row(render(), "Update 0").props.disabled, false);
  markOne = async () => { throw new Error("offline"); };
  await row(render(), "Update 0").props.onClick();
  assert.match(html(), /Please try again/);

  reset();
  markAll = () => new Promise(resolve => { release = resolve; });
  tree = render();
  const marking = button(tree, "Mark all read").props.onClick();
  await button(tree, "Mark all read").props.onClick();
  assert.equal(allReads, 1);
  assert.match(html(), /Marking as read/);
  release({ success: true });
  await marking;
  assert.equal(refreshes, 1);
  markAll = async () => ({ success: false });
  await button(render(), "Mark all read").props.onClick();
  assert.match(html(), /role="alert"/);
  assert.equal(button(render(), "Mark all read").props.disabled, false);

  reset();
  const readItems = items.map(item => ({ ...item, read: true }));
  find(render(readItems), n => n.type === "button" && n.props["aria-pressed"] === false).props.onClick();
  assert.match(html(readItems), /No unread notifications/);
  reset();
  assert.match(html([]), /No notifications yet/);
  assert.doesNotMatch(html([]), /Mark all read/);
  assert.match(html(items), /Showing 15 of 25 updates/, "new incoming props cannot leave an initially empty list hidden");
  for (const role of ["treasurer", "adviser"]) {
    const header = NotificationHeader({ role, title: "Notifications", tagline: "Report updates", unreadCount: 2 });
    const headerHtml = renderToStaticMarkup(header);
    assert.match(headerHtml, /text-base font-semibold leading-6[^\"]*lg:text-\[28px\]/);
    assert.match(headerHtml, /Activity center/);
    const back = find(header, n => n.type === "button");
    assert.match(back.props.className, /lg:hidden/);
    assert.doesNotMatch(back.props.className, /bg-|border /);
    back.props.onClick();
    assert.equal(pushes.at(-1), `/${role}/home`);
  }
  console.log("Notifications: mobile typography, month grouping, all/unread, unread visibility, pagination, role navigation, duplicate guards, pending and failure recovery passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
