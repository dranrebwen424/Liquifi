import assert from "node:assert";
import {
  filterReportItems,
  getActionRequiredReport,
  getFeaturedReportItems,
  type ReportOverviewItem,
} from "../lib/report-overview";

const items: ReportOverviewItem[] = [
  { eventId: "approved", eventName: "Approved", eventStatus: "open", createdAt: "2026-01-01", report: { id: "r1", fsDocumentNumber: "FS-1", status: "approved", generatedAt: "2026-02-01" } },
  { eventId: "pending", eventName: "Pending", eventStatus: "open", createdAt: "2026-01-02", report: { id: "r2", fsDocumentNumber: "FS-2", status: "pending_adviser_approval", generatedAt: "2026-02-02" } },
  { eventId: "rejected", eventName: "Rejected", eventStatus: "open", createdAt: "2026-01-03", report: { id: "r3", fsDocumentNumber: "FS-3", status: "rejected", generatedAt: "2026-02-03" } },
  { eventId: "none", eventName: "None", eventStatus: "open", createdAt: "2026-01-04", report: null },
  { eventId: "archived", eventName: "Archived", eventStatus: "archived", createdAt: "2026-01-05", report: { id: "r4", fsDocumentNumber: "FS-4", status: "approved", generatedAt: "2026-02-04" } },
];

assert.deepEqual(getFeaturedReportItems(items, "treasurer").map((item) => item.eventId), ["approved"]);
assert.deepEqual(getFeaturedReportItems(items, "adviser").map((item) => item.eventId), ["pending"]);
assert.equal(getActionRequiredReport(items, "treasurer")?.eventId, "rejected");
assert.equal(getActionRequiredReport(items, "adviser"), null);
assert.deepEqual(filterReportItems(items, "all").map((item) => item.eventId), ["rejected", "pending", "approved", "none"]);
assert.deepEqual(filterReportItems(items, "pending").map((item) => item.eventId), ["pending"]);
assert.deepEqual(filterReportItems(items, "approved").map((item) => item.eventId), ["approved"]);
assert.deepEqual(filterReportItems(items, "rejected").map((item) => item.eventId), ["rejected"]);

console.log("report overview check: all assertions passed");
