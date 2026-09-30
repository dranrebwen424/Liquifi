import assert from "node:assert/strict";
import { isAdminTopBarHiddenPage, isImmersivePage } from "../lib/event-route";

// The exact rule AdminTopBar composes.
const hidden = (pathname: string) => isAdminTopBarHiddenPage(pathname) || isImmersivePage(pathname);

// Dropped by the admin rule: the approvals queue and the whole department
// workspace, sub-pages included, so the bar never pops back one click deeper.
for (const pathname of [
  "/admin/approvals",
  "/admin/departments",
  "/admin/departments/abc",
  "/admin/departments/abc/users",
  "/admin/departments/abc/users/treasurers",
  "/admin/departments/abc/users/abc",
]) {
  assert.equal(isAdminTopBarHiddenPage(pathname), true, pathname);
}

// Still hidden on the pages that were already immersive.
for (const pathname of [
  "/admin/departments/abc/events/evt",
  "/admin/departments/abc/reports/evt",
  "/admin/departments/abc/reports/evt/expenses",
]) {
  assert.equal(hidden(pathname), true, pathname);
}

// Only /admin/profile keeps the desktop bar.
assert.equal(isAdminTopBarHiddenPage("/admin/profile"), false);
assert.equal(hidden("/admin/profile"), false);

// The prefix must not over-match a sibling route that merely starts similarly.
assert.equal(isAdminTopBarHiddenPage("/admin/department"), false);
assert.equal(isAdminTopBarHiddenPage("/admin/approvalsx"), false);

console.log("admin top bar check: all assertions passed");
