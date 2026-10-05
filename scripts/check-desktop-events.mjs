import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import React from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const loaded = new Map();
let query = "";
const navigation = { useSearchParams: () => new URLSearchParams(query), useRouter: () => ({ push() {}, replace() {} }) };
function load(path) {
  if (loaded.has(path)) return loaded.get(path);
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const result = { exports: {} };
  const resolve = (name) => {
    if (name === "next/navigation") return navigation;
    if (!name.startsWith("@/")) return require(name);
    const base = name.slice(2);
    const source = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(new URL(`../${candidate}`, import.meta.url)));
    assert.ok(source, `Cannot locate ${name}`);
    return load(source);
  };
  new Function("require", "module", "exports", compiled)(resolve, result, result.exports);
  loaded.set(path, result.exports);
  return result.exports;
}
const { EventTable } = load("components/events/EventTable.tsx");
const events = Array.from({ length: 7 }, (_, index) => ({
  id: `event-${index}`, name: index === 0 ? "Testing" : index === 1 ? "Black Friday" : `Event ${index}`,
  status: index < 5 ? "open" : "archived", created_at: "2026-10-01T02:00:00Z",
  latest_activity_at: `2026-10-0${index + 1}T02:00:00Z`, created_by: "treasurer-1",
  created_by_name: "Alex Cruz", budget_total: 10000, total_spent: index ? 1643.48 : 0, num_entries: index,
}));
for (const basePath of ["/treasurer/events", "/adviser/events", "/admin/departments/department-1/events"]) {
  const html = render(React.createElement(EventTable, { events, basePath, caption: "Department events" }));
  assert.equal((html.match(/scope="col"/g) || []).length, 7, "Six data columns plus the event link affordance");
  assert.equal((html.match(/scope="row"/g) || []).length, events.length);
  assert.match(html, /<caption class="sr-only">Department events<\/caption>/);
  assert.doesNotMatch(html, />Status<|EventStatusBadge/);
  assert.match(html, /₱10,000\.00/);
  assert.match(html, /₱0\.00/);
  assert.match(html, /₱1,643\.48/);
  assert.match(html, /<time dateTime="2026-10-01T02:00:00Z">Oct 1, 2026<\/time>/);
  assert.equal((html.match(/lucide-chevron-right/g) || []).length, events.length, "Every table row has a trailing chevron");
  for (const event of events) {
    assert.ok(html.includes(`href="${basePath}/${event.id}"`));
    assert.ok(html.includes(`aria-label="Open ${event.name}"`), "Trailing event links have accessible names");
  }
}

const { TreasurerHomeClient } = load("app/treasurer/home/client.tsx");
const { ActiveEventsClient } = load("app/treasurer/events/client.tsx");
const { EventBrowser } = load("components/events/EventBrowser.tsx");
for (const basePath of ["/treasurer/events", "/adviser/events", "/admin/departments/department-1/events"]) {
  const activeHtml = render(React.createElement(ActiveEventsClient, { events, basePath }));
  assert.ok(activeHtml.includes(`href="${basePath}/event-0"`));
  assert.ok(!activeHtml.includes(`href="${basePath}/event-5"`), "Active page excludes archived folders");
  const browserHtml = render(React.createElement(EventBrowser, { events, basePath }));
  assert.match(browserHtml, /<caption class="sr-only">Archived events from 2026<\/caption>/);
  assert.ok(browserHtml.includes(`href="${basePath}/event-5"`));
}
let html = render(React.createElement(TreasurerHomeClient, { events }));
assert.ok(html.startsWith('<div class="flex w-full flex-col">'), "Treasurer home uses the same uncapped shell gutters as Notifications");
assert.match(html, />Welcome Back!</);
assert.match(html, /type="search" aria-label="Search events"/);
assert.match(html, /caption[^>]*>Archived events from 2026/);
assert.doesNotMatch(html, /aria-label="List view"|aria-label="Grid view"/, "Home active folders no longer have a view toggle");
assert.match(html, /<details open=""[^>]*><summary[^>]*>.*?<h2[^>]*>Archive<\/h2><\/summary>/, "Desktop archive is an initially expanded native disclosure");
assert.ok(!html.includes('href="/treasurer/events/event-0"'), "Home keeps the four most recently active folders");
query = "q=Black+Friday";
html = render(React.createElement(TreasurerHomeClient, { events }));
assert.ok(html.includes('href="/treasurer/events/event-1"'));
assert.ok(!html.includes('href="/treasurer/events/event-2"'), "Search filters the existing events");
query = "q=No+such+event";
html = render(React.createElement(TreasurerHomeClient, { events }));
assert.match(html, /No events match your filters/);
query = "";
html = render(React.createElement(TreasurerHomeClient, { events: [] }));
assert.match(html, /No events yet/);
html = render(React.createElement(TreasurerHomeClient, { events: events.filter((event) => event.status === "open") }));
assert.match(html, /<details open=""/);
assert.match(html, /No archived events yet/);
html = render(React.createElement(TreasurerHomeClient, { events, readOnly: true, paths: {
  home: "/adviser/home", events: "/adviser/events", event: "/adviser/events",
} }));
assert.doesNotMatch(html, /aria-label="New event"|>New Event<|>Welcome Back!</);
assert.match(html, /href="\/adviser\/events\/event-4"/);
assert.ok(html.startsWith('<div class="flex w-full flex-col lg:mx-auto lg:max-w-6xl">'), "Adviser home retains its desktop content cap");

// Verify the mobile home JSX was not redesigned while changing the desktop branch.
function jsxWithClass(source, className, includeExpression = false) {
  const ast = ts.createSourceFile("client.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (!found && ts.isJsxElement(node) && node.openingElement.attributes.properties.some((prop) =>
      ts.isJsxAttribute(prop) && prop.name.getText(ast) === "className" && prop.initializer &&
      ts.isStringLiteral(prop.initializer) && prop.initializer.text === className)) {
      if (includeExpression) {
        let owner = node.parent;
        while (owner && !ts.isJsxExpression(owner)) owner = owner.parent;
        assert.ok(owner?.expression, "Missing conditional JSX owner");
        found = owner.expression.getText(ast);
      } else found = node.getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found, `Missing ${className} branch`);
  return found.replace(/\r\n/g, "\n");
}
// Render the actual desktop action JSX without loading unrelated modal/backend modules.
const budgetSource = read("components/events/BudgetSummary.tsx");
const budgetActions = jsxWithClass(budgetSource, "hidden flex-col gap-2 lg:flex", true);
const actionCode = ts.transpileModule(`export function Actions({ readOnly, isArchived, canMutate, isLocked, eventId, canIncreaseBudget }) { return (${budgetActions}); }`, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
const actionModule = { exports: {} };
const { Plus, FileText } = require("lucide-react");
new Function("require", "module", "exports", "Link", "Plus", "FileText", "cn", "setLogEntryOpen", "setIncreaseBudgetOpen", actionCode)(
  require, actionModule, actionModule.exports, require("next/link").default, Plus, FileText,
  load("lib/utils.ts").cn, () => {}, () => {},
);
for (const state of [
  { canMutate: true, isLocked: false, isArchived: false },
  { canMutate: false, isLocked: true, isArchived: false },
  { canMutate: false, isLocked: true, isArchived: true },
  { canMutate: true, isLocked: false, isArchived: true },
]) {
  const actionsHtml = render(React.createElement(actionModule.exports.Actions, { ...state, eventId: "event-1", canIncreaseBudget: state.canMutate && !state.isLocked }));
  assert.match(actionsHtml, /href="\/treasurer\/reports\/event-1"/);
  assert.match(actionsHtml, />View Report<\/a>/);
  assert.doesNotMatch(actionsHtml, /Generate Report|Archived — no reports/);
  assert.equal((actionsHtml.match(/<button/g) || []).length, state.isArchived ? 0 : 2, "Archived desktop events omit mutating controls");
  assert.equal((actionsHtml.match(/disabled=""/g) || []).length, !state.isArchived && state.isLocked ? 2 : 0, "Locked event mutation controls stay disabled");
}
assert.equal(render(React.createElement(actionModule.exports.Actions, { readOnly: true })), "", "Read only viewers keep their existing role specific report control");
const originalBudget = execFileSync("git", ["show", "HEAD:components/events/BudgetSummary.tsx"], { encoding: "utf8" });
const mobileBudgetBranch = (source) => source.slice(source.indexOf("  if (mobileOnly) {"), source.indexOf("  // ── Desktop layout")).replace(/\r\n/g, "\n");
assert.equal(mobileBudgetBranch(budgetSource), mobileBudgetBranch(originalBudget), "Mobile budget markup and actions stay unchanged");
assert.match(jsxWithClass(read("app/treasurer/events/[eventId]/page.tsx"), "hidden lg:block"), /\{!isArchived && \(\s*<ArchiveEventButton/, "Desktop archived events omit the Archive action");
const originalHome = execFileSync("git", ["show", "HEAD:app/treasurer/home/client.tsx"], { encoding: "utf8" });
assert.equal(jsxWithClass(read("app/treasurer/home/client.tsx"), "md:hidden"), jsxWithClass(originalHome, "md:hidden"), "Mobile home markup stays identical");
for (const [path, mobileClass] of [
  ["app/treasurer/events/[eventId]/page.tsx", "lg:hidden px-3 pt-6"],
  ["components/events/ReadOnlyEventView.tsx", "px-3 pt-6 lg:hidden"],
]) {
  const source = read(path);
  const original = execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" });
  assert.equal(jsxWithClass(source, mobileClass), jsxWithClass(original, mobileClass), `${path} mobile event layout stays identical`);
  const desktop = jsxWithClass(source, "hidden lg:block");
  assert.doesNotMatch(desktop, />\s*Back to events\s*</, "Desktop has no separate back link row");
  assert.match(desktop, /<div className="flex min-w-0 items-start gap-2\.5">\s*<Link[\s\S]*?aria-label="Back to events"[\s\S]*?<ArrowLeft[^>]*aria-hidden="true"[^>]*\/>\s*<\/Link>\s*<div className="min-w-0">/, "Desktop arrow sits beside the event name and metadata with an accessible name");
  assert.match(desktop, /<EventStatusBadge status=\{event.status\}/, "Event status stays beside the title");
}
for (const path of ["app/treasurer/events/client.tsx", "components/events/EventBrowser.tsx"]) {
  assert.match(read(path), /<FolderCard/);
  assert.match(read(path), /<EventTable/);
  assert.match(read(path), /hidden md:block/);
}
assert.match(read("components/treasurer/TreasurerSidebar.tsx"), /primaryAction=/);
assert.match(read("components/treasurer/TreasurerSidebar.tsx"), /import\("@\/components\/events\/NewEventModal"\)/);
assert.match(read("components/layout/Sidebar.tsx"), /lg:flex/);
console.log("Desktop event checks passed: tables and role links, search, empty/read only states, inline event back arrows, and unchanged mobile home/event markup.");
