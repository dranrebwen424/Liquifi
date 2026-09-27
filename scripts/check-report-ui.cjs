/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks load the actual TSX in this standalone check. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");

// Run the real TSX without adding a test runtime dependency or contacting the backend.
const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
const mocks = new Map();
Module._load = function (request, parent, isMain) {
  if (mocks.has(request)) return mocks.get(request);
  const resolved = request.startsWith("@/") ? path.join(root, request.slice(2)) : request;
  return originalLoad.call(this, resolved, parent, isMain);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}

const event = {
  id: "event-1", name: "Council Expo", department_id: "dept-1", status: "open",
  budget_total: 25000, total_spent: 3000, is_locked: false, budget_locked: true,
  has_unresolved_overspend: false, created_at: "2026-08-26T00:00:00Z",
  created_by_name: "Sample Treasurer",
  entries: [
    { id: "entry-1", type: "receipt", status: "deducted", category: "supplies", amount: 3000 },
    { id: "entry-2", type: "receipt", status: "voided", category: "meals", amount: 9000 },
  ],
};
const report = {
  id: "report-1", event_id: event.id, fs_document_number: "FS-CCS-2026-00001",
  status: "pending_adviser_approval", revision_count: 2,
  generated_at: "2026-09-26T00:00:00Z", rejection_reason: null,
};
let currentEvent = event;
let currentReports = [report];
let reportReads = 0;
let proofReads = 0;
mocks.set("@/lib/auth-guard", { requireRole: async (role) => {
  assert.equal(role, "treasurer");
  return { departmentId: "dept-1" };
} });
mocks.set("@/lib/queries/events", { getEventDashboard: async () => currentEvent });
mocks.set("@/lib/queries/reports", { getAllReportsByEvent: async (eventId, departmentId) => {
  assert.equal(eventId, event.id);
  assert.equal(departmentId, "dept-1");
  reportReads += 1;
  return currentReports;
} });
mocks.set("@/lib/queries/budget-proofs", { getBudgetProofsByEvent: async (eventId, departmentId) => {
  assert.equal(eventId, event.id);
  assert.equal(departmentId, "dept-1");
  proofReads += 1;
  return [];
} });

const render = (node) => renderToStaticMarkup(
  React.createElement(AppRouterContext.Provider, { value: { refresh() {} } }, node),
);
const { TreasurerReportWorkspace } = require("../components/reports/TreasurerReportWorkspace.tsx");
const workspace = (eventValue, latestReport) => render(React.createElement(TreasurerReportWorkspace, {
  event: eventValue, latestReport,
}));

async function main() {
  for (const status of [null, "rejected", "cancelled", "pending_adviser_approval", "approved"]) {
    const latest = status ? { ...report, status, rejection_reason: status === "rejected" ? "Please correct <the totals>." : null } : null;
    const html = workspace(event, latest);
    assert(!html.includes("<details"), "The report must not have collapsible sections");
    for (const destination of ["budget-history", "spending-summary", "previous-revisions"]) {
      assert(html.includes(`/treasurer/reports/${event.id}/${destination}`));
    }
    const canGenerate = !status || ["rejected", "cancelled"].includes(status);
    assert.equal(html.includes("Generate Report"), canGenerate);
    assert.equal(html.includes(">Cancel</button>"), status === "pending_adviser_approval");
    assert.equal(html.includes("Print Report"), status === "approved");
    assert.equal(html.includes("Adviser feedback"), status === "rejected");
    if (status === "rejected") assert(html.includes("Please correct &lt;the totals&gt;."));
    if (canGenerate) {
      assert(html.indexOf("Signatory 1 full name") < html.indexOf("Signatory 1 position"));
      assert(html.includes("lucide-trash-2"));
    }
  }
  const archived = workspace({ ...event, status: "archived" }, { ...report, status: "approved" });
  assert(!archived.includes("Generate Report"));
  assert(!archived.includes(">Cancel</button>"));
  assert(archived.includes("Your report is complete"));
  assert(archived.includes("Print Report"));
  assert(!archived.includes('aria-current="step"'));

  const blocked = workspace({ ...event, entries: [{ ...event.entries[0], status: "pending_approval" }] }, null);
  assert(blocked.includes("Your adviser needs to resolve the pending expenses"));
  assert.match(blocked, /<button[^>]*disabled=""[^>]*aria-describedby="report-generation-blocked"/);

  const pages = ["", "budget-history/", "spending-summary/", "previous-revisions/"];
  for (const page of pages) {
    const Page = require(`../app/treasurer/reports/[eventId]/${page}page.tsx`).default;
    const props = { params: Promise.resolve({ eventId: event.id }) };
    const html = render(await Page(props));
    if (page) assert(html.includes(`href="/treasurer/reports/${event.id}"`));
    if (page === "budget-history/") assert(html.includes("No budget history yet."));
    if (page === "previous-revisions/") assert(html.includes("No previous revisions yet."));
    if (page === "spending-summary/") {
      assert(html.includes("3,000.00"));
      assert(!html.includes("9,000.00"), "Voided expenses must not contribute to spending");
    }
    const readsBefore = [reportReads, proofReads];
    for (const invalid of [null, { ...event, department_id: "another-dept" }]) {
      currentEvent = invalid;
      await assert.rejects(() => Page(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
      assert.deepEqual([reportReads, proofReads], readsBefore);
    }
    currentEvent = event;
  }

  currentReports = [report, { ...report, id: "old-report", status: "rejected", revision_count: 1, rejection_reason: "Fix the signatories." }];
  const RevisionsPage = require("../app/treasurer/reports/[eventId]/previous-revisions/page.tsx").default;
  const revisions = render(await RevisionsPage({ params: Promise.resolve({ eventId: event.id }) }));
  assert(revisions.includes("September 2026"));
  assert(revisions.includes("/api/reports/old-report/pdf"));
  assert(!revisions.includes("/api/reports/report-1/pdf"));
  assert(revisions.includes("Fix the signatories."));
  console.log("Report UI: all six states, linked pages, feedback, spend exclusion, revisions, and department guards passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
