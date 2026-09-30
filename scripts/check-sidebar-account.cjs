/* eslint-disable @typescript-eslint/no-require-imports -- Run the actual TSX with the repository's existing compiler. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { Menu } = require("@base-ui/react/menu");
const { Avatar } = require("@base-ui/react/avatar");
const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
let state = [], refs = [], cursor = 0, refCursor = 0;
const hooks = {
  ...React,
  useState(initial) {
    const i = cursor++;
    if (!(i in state)) state[i] = initial;
    return [state[i], (value) => { state[i] = value; }];
  },
  useRef(initial) { return refs[refCursor++] ??= { current: initial }; },
  useCallback: (fn) => fn,
};
Module._load = function (request, parent, isMain) {
  if (request === "react" && parent?.filename.startsWith(path.join(root, "components"))) return hooks;
  return originalLoad.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, isMain);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
  };
}
const { SidebarAccountMenu } = require("../components/layout/SidebarAccountMenu.tsx");
const { MobileSidebarDrawer } = require("../components/layout/MobileSidebarDrawer.tsx");
const account = { name: "Alex Cruz", email: "alex@example.test", avatarUrl: "https://example.test/avatar.jpg" };
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
}
function render(props = {}) {
  cursor = 0; refCursor = 0;
  return SidebarAccountMenu({ account, role: "treasurer", ...props });
}
async function main() {
  for (const role of ["treasurer", "adviser", "admin"]) {
    for (const collapsed of [true, false]) {
      const tree = render({ role, collapsed });
      const portal = find(tree, (n) => n.type === Menu.Portal);
      assert(portal, "menu must escape the sidebar's clipping/width");
      const position = find(portal, (n) => n.type === Menu.Positioner);
      assert.equal(position.props.side, collapsed ? "right" : "top");
      assert.equal(find(tree, (n) => n.type === Menu.LinkItem).props.render.props.href, "/" + role + "/profile");
      assert.equal(find(tree, (n) => n.type === Avatar.Image).props.src, account.avatarUrl);
      assert.equal(find(tree, (n) => n.type === Avatar.Fallback).props.children, "AC");
      assert.equal(find(tree, (n) => n.type === Menu.Item).props.children[1], "Log out");
    }
  }
  assert.equal(find(render({ account: { ...account, avatarUrl: null } }), (n) => n.type === Avatar.Image).props.src, undefined);
  for (const [role, title] of [["treasurer", "Treasurer"], ["adviser", "Adviser"]]) {
    const Sidebar = require("../components/" + role + "/" + title + "Sidebar.tsx")[title + "Sidebar"];
    const Shell = require("../components/" + role + "/" + title + "LayoutShell.tsx")[title + "LayoutShell"];
    const desktop = Sidebar({ account, unreadCount: 7 }).props.navItems;
    assert(!desktop.some((item) => item.label === "Profile"));
    assert.equal(desktop.find((item) => item.label === "Notifications").badge, 7);
    cursor = 0; refCursor = 0; state = []; refs = [];
    const mobile = find(Shell({ account, unreadCount: 7 }), (n) => n.type === MobileSidebarDrawer);
    assert(!mobile.props.navItems.some((item) => ["Profile", "Notifications"].includes(item.label)));
    assert.equal(mobile.props.account, account);
  }
  state = []; refs = [];
  let calls = 0, resolveRequest, navigated;
  global.window = { location: { assign: (url) => { navigated = url; } } };
  global.fetch = (url, options) => {
    assert.equal(url, "/api/auth/logout");
    assert.equal(options.method, "POST");
    calls++;
    return new Promise((resolve) => { resolveRequest = resolve; });
  };
  const logout = find(render(), (n) => n.type === Menu.Item).props.onClick;
  const pending = logout();
  await logout();
  assert.equal(calls, 1, "rapid clicks must send one logout request");
  assert.equal(find(render(), (n) => n.type === Menu.Item).props.disabled, true);
  resolveRequest({ ok: false });
  await pending;
  assert.equal(navigated, undefined, "failed logout must keep the session page");
  assert(find(render(), (n) => n.props.role === "alert"), "failed logout must be retryable with an error");
  global.fetch = async () => ({ ok: true });
  await find(render(), (n) => n.type === Menu.Item).props.onClick();
  assert.equal(navigated, "/login");
  console.log("Sidebar account checks passed: role links, mobile/desktop navigation, avatar fallback, portal placement, logout failure/retry and duplicate protection.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
