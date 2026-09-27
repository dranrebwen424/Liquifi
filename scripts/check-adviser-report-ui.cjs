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
mocks.set("@/actions/entries", new Proxy({}, { get: () => () => { throw new Error("Read-only report expenses must never mutate entries"); } }));
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
  budget_total: 25000, total_spent: 3000, created_at: "2026-09-20T00:00:00Z",
  created_by_name: "Sample Treasurer",
  entries: [
    { id: "entry-1", type: "receipt", status: "deducted", category: "supplies", amount: 3000, supplier_name: "Paper shop", document_type_raw: "Receipt", created_at: "2026-09-21T00:00:00Z" },
    { id: "entry-2", type: "manual", status: "voided", category: "meals", amount: 9000, void_reason: "Duplicate", voidedByName: "Sample Treasurer", created_at: "2026-09-20T00:00:00Z" },
  ],
};
const report = { id: "report-1", event_id: event.id, fs_document_number: "FS-CCS-2026-00001", status: "pending_adviser_approval", revision_count: 1, generated_at: "2026-09-26T00:00:00Z" };
const flagged = { ...event, entries: [
  { ...event.entries[0], causes_overspend: true, overspend_resolved_at: null, overspend_explanation: "Additional <paper> was needed." },
  { ...event.entries[1], causes_overspend: true, overspend_explanation: "Do not show this voided expense." },
] };
let currentEvent = event;
let currentReports = [report];
let departmentId = "dept-1";
let historyReads = 0;
let refreshes = 0;
mocks.set("@/lib/auth-guard", { requireRole: async (role) => {
  assert.equal(role, "adviser");
  return { departmentId };
} });
mocks.set("@/lib/queries/events", { getEventDashboard: async () => currentEvent });
mocks.set("@/lib/queries/reports", { getAllReportsByEvent: async (eventId, dept) => {
  assert.equal(eventId, event.id);
  assert.equal(dept, "dept-1");
  historyReads++;
  return currentReports;
} });
mocks.set("@/lib/queries/budget-proofs", { getBudgetProofsByEvent: async (eventId, dept) => {
  assert.equal(eventId, event.id);
  assert.equal(dept, "dept-1");
  historyReads++;
  return [];
} });
const render = (node) => renderToStaticMarkup(
  React.createElement(AppRouterContext.Provider, { value: { refresh() { refreshes++; } } }, node),
);
const { AdviserReportReview } = require("../components/adviser/AdviserReportReview.tsx");

function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
}

async function main() {
  for (const status of ["pending_adviser_approval", "approved", "rejected", "cancelled"]) {
    const html = render(React.createElement(AdviserReportReview, { event, report: { ...report, status } }));
    assert(!html.includes("overspend-title"));
    assert(!html.includes("Paper shop"), "Expenses must live on their own page");
    assert(html.includes('aria-label="View report PDF"'));
    assert(html.includes('aria-label="Download report PDF"'));
    assert(html.includes("/api/reports/report-1/pdf?dl=1"));
    assert.equal(html.includes(">Approve</button>"), status === "pending_adviser_approval");
    assert.equal(html.includes(">Reject</button>"), status === "pending_adviser_approval");
    // The Control Number panel is report identity only — the adviser's own
    // rejection reason must not render inside it, even on a rejected report.
    assert(!html.includes("Correct the receipt."), "rejection reason must stay out of the Control Number panel");
    // Event metadata scales down on mobile, matching the treasurer workspace.
    assert(html.includes("By: Sample Treasurer"), "event creator must still render");
    assert(html.includes("text-[10px] leading-4 text-text-secondary sm:text-xs sm:leading-5"), "event metadata must use the compact mobile scale");
    for (const destination of ["expenses", "budget-history", "spending-summary", "previous-revisions"]) {
      assert(html.includes(`href="/adviser/reports/event-1/${destination}"`));
    }
  }
  // A rejected report still surfaces its stored reason on Previous Revisions,
  // which is where the treasurer/audviser history belongs.
  const rejectedWithReason = render(React.createElement(AdviserReportReview, {
    event, report: { ...report, status: "rejected", rejection_reason: "Correct the receipt." },
  }));
  assert(!rejectedWithReason.includes("Correct the receipt."), "rejection reason must not render on the report page itself");
  const flaggedHtml = render(React.createElement(AdviserReportReview, { event: flagged, report }));
  assert(flaggedHtml.includes("overspend-title"));
  assert(flaggedHtml.includes("Additional &lt;paper&gt; was needed."));
  assert(!flaggedHtml.includes("Do not show this voided expense."));
  const resolved = { ...flagged, entries: flagged.entries.map((entry) => ({ ...entry, overspend_resolved_at: "2026-09-27" })) };
  assert(!render(React.createElement(AdviserReportReview, { event: resolved, report })).includes("overspend-title"));
  const archived = render(React.createElement(AdviserReportReview, { event: { ...event, status: "archived" }, report }));
  // Signed Report is an archived-only destination, and the adviser row must
  // point at the adviser's own route.
  assert(archived.includes('href="/adviser/reports/event-1/signed-report"'));
  assert(archived.includes(">Signed Report</span>"));
  for (const status of ["pending_adviser_approval", "approved", "rejected", "cancelled"]) {
    const open = render(React.createElement(AdviserReportReview, { event, report: { ...report, status } }));
    assert(!open.includes("signed-report"), `Signed Report must not appear for a ${status} report`);
  }
  assert(!archived.includes(">Approve</button>"));
  assert(!archived.includes(">Reject</button>"));

  for (const section of ["", "expenses/", "budget-history/", "spending-summary/", "previous-revisions/"]) {
    const Page = require(`../app/adviser/reports/[eventId]/${section}page.tsx`).default;
    const props = { params: Promise.resolve({ eventId: event.id }) };
    const html = render(await Page(props));
    if (section) assert(html.includes('href="/adviser/reports/event-1"'));
    if (section === "expenses/") {
      assert(html.includes("Paper shop"));
      assert(html.includes("Duplicate"), "Voided records must remain visible");
      assert(html.includes('aria-label="Grid view"'));
      assert(html.includes('aria-label="List view"'));
      assert(!html.includes(">Void Entry</button>"));
    }
    if (section === "spending-summary/") {
      assert(html.includes("3,000.00"));
      assert(!html.includes("9,000.00"));
    }
    if (section === "budget-history/") assert(html.includes("No budget history yet."));
    if (section === "previous-revisions/") assert(html.includes("No previous revisions yet."));
    const before = historyReads;
    for (const invalid of [null, { ...event, department_id: "another-dept" }]) {
      currentEvent = invalid;
      await assert.rejects(() => Page(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
      assert.equal(historyReads, before);
    }
    currentEvent = event;
    departmentId = null;
    await assert.rejects(() => Page(props), /NEXT_HTTP_ERROR_FALLBACK;404/);
    departmentId = "dept-1";
  }
  currentReports = [report, { ...report, id: "older", revision_count: 0, status: "rejected", rejection_reason: "Fix the total." }];
  const Revisions = require("../app/adviser/reports/[eventId]/previous-revisions/page.tsx").default;
  const revisions = render(await Revisions({ params: Promise.resolve({ eventId: event.id }) }));
  assert(revisions.includes("/api/reports/older/pdf"));
  assert(!revisions.includes("/api/reports/report-1/pdf"));
  assert(revisions.includes("Fix the total."));

  // Execute the component's real event handlers with isolated React hook state.
  // This covers requests and UI transitions without sending a financial decision.
  let slots = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  mocks.set("react", hooks);
  mocks.set("next/navigation", { useRouter: () => ({ refresh() { refreshes++; } }) });
  delete require.cache[require.resolve("../components/adviser/AdviserReportReview.tsx")];
  const Review = require("../components/adviser/AdviserReportReview.tsx").AdviserReportReview;
  let tree;
  function update(eventValue = flagged) { cursor = 0; tree = Review({ event: eventValue, report }); }
  function dialog() { return find(tree, (node) => node.props?.modal === true).props; }
  function click(label) { find(tree, (node) => node.type === "button" && node.props.children === label).props.onClick(); update(); }
  const originalFetch = global.fetch;
  const calls = [];
  try {
    update();
    click("Approve");
    assert(dialog().open);
    assert.match(dialog().description, /acknowledges all unresolved overspend/);
    assert.equal(calls.length, 0, "Opening a modal must not submit a decision");
    let finish;
    global.fetch = (url, options) => { calls.push({ url, options }); return new Promise((resolve) => { finish = resolve; }); };
    const pending = dialog().onConfirm();
    const duplicate = dialog().onConfirm();
    update();
    assert(dialog().busy);
    dialog().onClose();
    update();
    assert(dialog().open, "Busy dialogs cannot dismiss a pending request");
    assert.equal(calls.length, 1, "Double clicks must produce one request");
    finish({ ok: false, status: 500, json: async () => ({ error: "private internals" }) });
    await Promise.all([pending, duplicate]);
    update();
    assert(dialog().open && dialog().error);
    assert(!dialog().error.includes("private internals"));
    assert(find(tree, (node) => node.type === "button" && node.props.children === "Approve"));
    global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ success: true }) }; };
    await dialog().onConfirm();
    update();
    assert(!dialog().open);
    assert(!find(tree, (node) => node.type === "button" && node.props.children === "Approve"));
    assert(!find(tree, (node) => node.props?.id === "overspend-title"));
    assert.equal(refreshes, 1);

    slots = [];
    update();
    click("Reject");
    assert.equal(dialog().reason, "");
    const before = calls.length;
    await dialog().onConfirm();
    assert.equal(calls.length, before, "A blank reason must not submit");
    dialog().onReasonChange("  Correct the receipt.  ");
    find(tree, (node) => node.type === "textarea").props.onChange({ target: { value: "  Check the paper quantity.  " } });
    update();
    global.fetch = async () => { throw new Error("network down"); };
    await dialog().onConfirm();
    update();
    assert(dialog().open && dialog().error);
    assert.equal(dialog().reason, "  Correct the receipt.  ");
    global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ success: true }) }; };
    await dialog().onConfirm();
    update();
    const rejected = calls.at(-1);
    assert.equal(rejected.url, "/api/reports/report-1/reject");
    assert.deepEqual(JSON.parse(rejected.options.body), {
      rejection_reason: "Correct the receipt.",
      comments: [{ entry_id: "entry-1", text: "Check the paper quantity." }],
    });
    assert(!dialog().open);
    assert.equal(refreshes, 2);

    // Filtering reuses the actual ExpensesSection logic and retains detail data.
    hooks.useMemo = (compute) => compute();
    delete require.cache[require.resolve("../components/entries/ExpensesSection.tsx")];
    const { ExpensesSection } = require("../components/entries/ExpensesSection.tsx");
    const entries = [{ id: "one", type: "receipt", status: "deducted", amount: 50, documentType: "Receipt", createdAt: "2026-09-22", formPayload: { witness: "Witness" } }, { id: "two", type: "manual", status: "voided", amount: 1500, createdAt: "2026-09-21" }];
    slots = [];
    function expenseTree() { cursor = 0; return ExpensesSection({ entries, categories: [{ name: "Receipt" }], canMutate: false, isArchived: false, mobileLayout: true, backHref: "/adviser/reports/event-1" }); }
    let list = expenseTree();
    list.props.filters.onChange({ type: "manual", sort: "newest", budget: "all", category: "all" });
    list = expenseTree();
    assert.deepEqual(list.props.entries.map((entry) => entry.id), ["two"]);
    list.props.filters.onChange({ type: "all", sort: "amount_high", budget: "0-100", category: "Receipt" });
    list = expenseTree();
    assert.deepEqual(list.props.entries.map((entry) => entry.id), ["one"]);
    assert.equal(list.props.entries[0].formPayload.witness, "Witness");
    assert.equal(list.props.canMutate, false);
  } finally {
    global.fetch = originalFetch;
  }
  console.log("Adviser report UI: states, overspend visibility, links, read-only expenses, filtering, history, department guards, modal decisions, duplicate prevention, and failure recovery passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
