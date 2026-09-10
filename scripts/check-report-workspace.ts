import assert from "node:assert";
import { getReportWorkspaceState } from "../lib/report-workspace";

assert.deepEqual(getReportWorkspaceState("open", null), {
  state: "empty",
  step: 1,
});
assert.deepEqual(getReportWorkspaceState("open", "rejected"), {
  state: "rejected",
  step: 1,
});
assert.deepEqual(getReportWorkspaceState("open", "cancelled"), {
  state: "cancelled",
  step: 1,
});
assert.deepEqual(getReportWorkspaceState("open", "pending_adviser_approval"), {
  state: "pending",
  step: 2,
});
assert.deepEqual(getReportWorkspaceState("open", "approved"), {
  state: "approved",
  step: 3,
});
assert.deepEqual(getReportWorkspaceState("archived", "approved"), {
  state: "archived",
  step: 3,
});

console.log("report workspace check: all assertions passed");
