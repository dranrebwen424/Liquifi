import assert from "node:assert";
import {
  formatOriginalSubmissionAge,
  sortApprovalInboxEntries,
  type ApprovalInboxEntry,
} from "../lib/adviser-approval-inbox";

const entries: ApprovalInboxEntry[] = [
  { id: "first-newer", status: "pending_approval", created_at: "2026-09-12T08:00:00.000Z" },
  { id: "resubmitted-newer", status: "resubmitted", created_at: "2026-09-11T08:00:00.000Z" },
  { id: "first-older", status: "pending_approval", created_at: "2026-09-10T08:00:00.000Z" },
  { id: "resubmitted-older", status: "resubmitted", created_at: "2026-09-09T08:00:00.000Z" },
];

assert.deepEqual(sortApprovalInboxEntries(entries).map((entry) => entry.id), [
  "resubmitted-older",
  "resubmitted-newer",
  "first-older",
  "first-newer",
]);

assert.equal(
  formatOriginalSubmissionAge("2026-09-10T08:00:00.000Z", new Date("2026-09-13T09:00:00.000Z")),
  "Original submission 3 days ago",
);
assert.equal(
  formatOriginalSubmissionAge("2026-09-13T08:00:00.000Z", new Date("2026-09-13T09:00:00.000Z")),
  "Original submission today",
);

console.log("adviser approval inbox check: all assertions passed");
