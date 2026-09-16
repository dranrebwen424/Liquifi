import assert from "node:assert";
import { isAdminDepartmentWorkspace } from "../lib/admin-routes";

assert.equal(isAdminDepartmentWorkspace("/admin/departments"), false);
assert.equal(isAdminDepartmentWorkspace("/admin/departments/dept-1"), true);
assert.equal(isAdminDepartmentWorkspace("/admin/departments/dept-1/users/user-1"), true);
assert.equal(isAdminDepartmentWorkspace("/admin/approvals"), false);
console.log("admin route check: all assertions passed");
