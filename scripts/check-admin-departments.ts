import assert from "node:assert";
import { filterDepartments, type DepartmentSummary } from "../lib/admin-departments";

const rows: DepartmentSummary[] = [
  { id: "1", name: "College of Accountancy", code: "COA", is_active: true, created_at: "2026-01-01", adviser: "Ada", treasurer: "Tess" },
  { id: "2", name: "Engineering", code: "COE", is_active: false, created_at: "2026-02-01", adviser: null, treasurer: "Theo" },
];

assert.deepEqual(filterDepartments(rows, { query: "coa", status: "all", staffing: "all", sort: "name" }).map((row) => row.id), ["1"]);
assert.deepEqual(filterDepartments(rows, { query: "", status: "inactive", staffing: "all", sort: "name" }).map((row) => row.id), ["2"]);
assert.deepEqual(filterDepartments(rows, { query: "", status: "all", staffing: "needs_adviser", sort: "name" }).map((row) => row.id), ["2"]);
assert.deepEqual(filterDepartments(rows, { query: "", status: "all", staffing: "all", sort: "newest" }).map((row) => row.id), ["2", "1"]);
console.log("admin department check: all assertions passed");
