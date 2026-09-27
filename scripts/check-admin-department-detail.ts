import assert from "node:assert";
import { readFileSync } from "node:fs";
import { getDepartmentEventSections } from "../lib/admin-department-detail";

const events = [
  { id: "open-old", name: "Older Open", status: "open" as const, created_at: "2026-01-01" },
  { id: "archive-old", name: "Past Activity", status: "archived" as const, created_at: "2025-01-01" },
  { id: "open-new", name: "Newest Open", status: "open" as const, created_at: "2026-06-01" },
  { id: "open-2", name: "Second Open", status: "open" as const, created_at: "2026-05-01" },
  { id: "open-3", name: "Third Open", status: "open" as const, created_at: "2026-04-01" },
  { id: "open-4", name: "Fourth Open", status: "open" as const, created_at: "2026-03-01" },
  { id: "open-5", name: "Fifth Open", status: "open" as const, created_at: "2026-02-01" },
  { id: "archive-new", name: "Recent Archive", status: "archived" as const, created_at: "2026-07-01" },
];

const sections = getDepartmentEventSections(events, "", "newest");
assert.deepEqual(sections.activeEvents.map((event) => event.id), [
  "open-new",
  "open-2",
  "open-3",
  "open-4",
  "open-5",
  "open-old",
]);
assert.deepEqual(sections.recentActiveEvents.map((event) => event.id), [
  "open-new",
  "open-2",
  "open-3",
  "open-4",
]);
assert.deepEqual(sections.archivedEvents.map((event) => event.id), [
  "archive-new",
  "archive-old",
]);

const filtered = getDepartmentEventSections(events, "PAST", "oldest");
assert.deepEqual(filtered.activeEvents, []);
assert.deepEqual(filtered.archivedEvents.map((event) => event.id), ["archive-old"]);

const oldestFirst = getDepartmentEventSections(events, "", "oldest");
assert.deepEqual(oldestFirst.archivedEvents.map((event) => event.id), [
  "archive-old",
  "archive-new",
]);

// ── Admin report sub-routes ────────────────────────────────────────────
// Source-level guard assertions, matching how this script family already
// covers admin pages. Every department-nested report route must require the
// admin role and reject an event that does not belong to the department in
// the path, before it reads anything.
const reportSubRoutes = [
  "app/admin/departments/[departmentId]/reports/[eventId]/page.tsx",
  "app/admin/departments/[departmentId]/reports/[eventId]/expenses/page.tsx",
  "app/admin/departments/[departmentId]/reports/[eventId]/budget-history/page.tsx",
  "app/admin/departments/[departmentId]/reports/[eventId]/spending-summary/page.tsx",
  "app/admin/departments/[departmentId]/reports/[eventId]/previous-revisions/page.tsx",
  "app/admin/departments/[departmentId]/reports/[eventId]/signed-report/page.tsx",
];
for (const route of reportSubRoutes) {
  const source = readFileSync(route, "utf8");
  assert.match(source, /requireRole\("admin"\)/, `${route} must require the admin role`);
  assert.match(
    source,
    /event\.department_id !== departmentId\)\s*notFound\(\)/,
    `${route} must 404 when the event is not in the department path`,
  );
}

// The workspace must honour ?tab=reports, or the admin report page's back
// link silently lands on the Events tab.
const workspace = readFileSync("app/admin/departments/[departmentId]/page.tsx", "utf8");
assert.match(workspace, /tab === "reports"/, "the department workspace must accept ?tab=reports");

// ── Adviser and admin event views share one component ─────────────────
// The two read-only event pages must render the same ReadOnlyEventView so the
// department workspace cannot drift from the adviser view, and each must keep
// its own role guard and link targets.
for (const page of [
  "app/adviser/events/[eventId]/page.tsx",
  "app/admin/departments/[departmentId]/events/[eventId]/page.tsx",
]) {
  const source = readFileSync(page, "utf8");
  assert.match(source, /<ReadOnlyEventView/, `${page} must render the shared ReadOnlyEventView`);
  assert.match(source, /reportHref=/, `${page} must pass its own reportHref`);
  assert.match(source, /backHref=/, `${page} must pass its own backHref`);
}
assert.match(
  readFileSync("app/adviser/events/[eventId]/page.tsx", "utf8"),
  /requireRole\("adviser"\)/,
);
assert.match(
  readFileSync("app/admin/departments/[departmentId]/events/[eventId]/page.tsx", "utf8"),
  /requireRole\("admin"\)/,
);
// The shared view must stay read-only.
const shared = readFileSync("components/events/ReadOnlyEventView.tsx", "utf8");
assert.match(shared, /readOnly/, "the shared view must pass readOnly");
assert.doesNotMatch(shared, /canMutate=\{true\}/, "the shared view must never allow mutation");
assert.match(shared, /ViewReportPill/, "the shared view must keep the View Report pill");

console.log("admin department detail check: all assertions passed");
