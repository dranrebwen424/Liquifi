import assert from "node:assert";
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

console.log("admin department detail check: all assertions passed");
