import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  getDepartmentUserSections,
  searchDepartmentMembers,
  sortDepartmentMembers,
  type DepartmentMemberSummary,
} from "../lib/admin-department-users";

const users: DepartmentMemberSummary[] = [
  { id: "t-old", first_name: "Old", last_name: "Treasurer", email: "old@example.com", role: "treasurer", account_status: "deactivated", created_at: "2026-01-01" },
  { id: "a-new", first_name: "Ana", last_name: "Adviser", email: "ana@example.com", role: "adviser", account_status: "active", created_at: "2026-05-01" },
  { id: "t-new", first_name: "New", last_name: "Treasurer", email: "new@example.com", role: "treasurer", account_status: "pending_approval", created_at: "2026-06-01" },
  { id: "t-active", first_name: "Current", last_name: "Treasurer", email: "current@example.com", role: "treasurer", account_status: "active", created_at: "2025-01-01" },
  { id: "a-old", first_name: "Former", last_name: "Adviser", email: "former@example.com", role: "adviser", account_status: "deactivated", created_at: "2026-02-01" },
];

assert.deepEqual(sortDepartmentMembers(users).map((user) => user.id), ["a-new", "t-active", "t-new", "a-old", "t-old"]);
const sections = getDepartmentUserSections(users);
assert.deepEqual(sections.treasurers.map((user) => user.id), ["t-active", "t-new", "t-old"]);
assert.deepEqual(sections.advisers.map((user) => user.id), ["a-new", "a-old"]);
assert.deepEqual(searchDepartmentMembers(users, "current").map((user) => user.id), ["t-active"]);
assert.deepEqual(searchDepartmentMembers(users, "ANA@EXAMPLE.COM").map((user) => user.id), ["a-new"]);
assert.deepEqual(searchDepartmentMembers(users, "   "), []);
assert.equal(users[0].id, "t-old");

const tabSource = readFileSync("components/admin/DepartmentUsersTab.tsx", "utf8");
const detailSource = readFileSync("components/admin/DepartmentDetailClient.tsx", "utf8");
const cardSource = readFileSync("components/admin/DepartmentMemberCard.tsx", "utf8");
assert.match(tabSource, /slice\(0, 3\)/);
assert.match(tabSource, /View all/);
assert.match(tabSource, /query\.trim\(\)/);
assert.match(detailSource, /placeholder="Search users"/);
assert.match(detailSource, /activeTab === "Users"/);
assert.match(cardSource, /Pending approval/);
assert.match(cardSource, /Deactivated/);
assert.match(cardSource, /ChevronRight/);

const rolePageSource = readFileSync("components/admin/DepartmentRoleUsersPage.tsx", "utf8");
const treasurerPageSource = readFileSync("app/admin/departments/[departmentId]/users/treasurers/page.tsx", "utf8");
const adviserPageSource = readFileSync("app/admin/departments/[departmentId]/users/advisers/page.tsx", "utf8");
assert.match(rolePageSource, /eq\("department_id", departmentId\)/);
assert.match(rolePageSource, /eq\("role", role\)/);
assert.match(rolePageSource, /\?tab=users/);
assert.match(rolePageSource, /pt-3/);
assert.match(treasurerPageSource, /role="treasurer"/);
assert.match(adviserPageSource, /role="adviser"/);

console.log("admin department users check: all assertions passed");
