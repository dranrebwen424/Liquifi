/* eslint-disable @typescript-eslint/no-require-imports -- Execute the real dialogs with the installed compiler. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
const originalLoad = Module._load;
let state = [], refs = [], cursor = 0, refCursor = 0, confirms = 0, discards = 0, closes = 0, requests = 0;
const hooks = { ...React,
  useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value; }]; },
  useRef(initial) { return refs[refCursor++] ??= { current: initial }; },
  useEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
};
const Group = ({ children }) => children;
const Motion = ({ children, className, role, ...props }) => React.createElement("div", { className, role, "aria-label": props["aria-label"] }, children);
const Sheet = ({ children }) => React.createElement("div", { "data-sheet": true }, children);
const Upload = () => React.createElement("div", null, "Receipt upload");
const Picker = () => React.createElement("div", null, "Category picker");
const QuickForm = () => React.createElement("div", null, "Manual form");
const mocks = {
  react: hooks,
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "framer-motion": { motion: { div: Motion, button: Motion }, AnimatePresence: Group },
  "@/components/ui/CssBottomSheet": { CssBottomSheet: Sheet },
  "@/components/entries/ReceiptUpload": { ReceiptUpload: Upload },
  "@/components/entries/ManualCategoryPicker": { ManualCategoryPicker: Picker },
  "@/components/entries/ManualQuickForm": { ManualQuickForm: QuickForm },
  "@/components/entries/CameraViewfinder": { CameraViewfinder: () => null },
  "@/components/LottiePlayer": { __esModule: true, default: () => null },
  "@/lib/image": { prepareImage: async file => file },
  "@/actions/entries": { confirmReceiptEntry: async () => { confirms++; return { success: true }; }, discardReceiptEntry: async () => { discards++; return { success: true }; }, submitManualEntry: async () => ({ success: true }) },
};
Module._load = function(request, parent, isMain) {
  if (mocks[request]) return mocks[request];
  return originalLoad.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, isMain);
};
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const { LogEntryModal } = require("../components/entries/LogEntryModal.tsx");
const { IncreaseBudgetModal } = require("../components/events/IncreaseBudgetModal.tsx");
function reset() { state = []; refs = []; }
function render(Component, extra = {}) { cursor = 0; refCursor = 0; return Component({ open: true, onClose: () => { closes++; }, eventId: "event-1", currentBudget: 20000, ...extra }); }
function find(node, predicate) { if (!node || typeof node !== "object") return null; if (predicate(node)) return node; for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; } return null; }
function text(node) { if (typeof node === "string" || typeof node === "number") return String(node); if (!node) return ""; return React.Children.toArray(node.props?.children).map(text).join(" "); }
function html(Component) { return renderToStaticMarkup(render(Component)); }
async function main() {
  reset();
  let tree = render(LogEntryModal);
  let output = renderToStaticMarkup(tree);
  assert.match(output, /New entry/);
  assert.doesNotMatch(output, /You can review the extracted details before confirming/);
  assert.equal(find(tree, n => n.type === "footer"), null, "New Entry has no desktop footer");
  assert.match(find(tree, n => n.props?.role === "dialog").props.className, /scrollbar-hide[^"]*overflow-y-auto/);
  assert.match(output, /lg:max-w-2xl lg:rounded-3xl/);
  assert.match(output, /Extract details from a photo/);
  assert.match(output, /aria-pressed="true"/);
  find(tree, n => n.type === "button" && n.props["aria-pressed"] === false).props.onClick();
  tree = render(LogEntryModal);
  assert(find(tree, n => n.type === Picker));
  find(tree, n => n.type === Picker).props.onSelect("meals");
  assert(find(render(LogEntryModal), n => n.type === QuickForm));
  reset();
  find(render(LogEntryModal), n => n.type === Upload).props.onParsed({ entryId: "entry-1", parsed: { documentTypeRaw: "Receipt", documentNumber: "123", issueDate: "2026-10-30", supplierName: "Campus Store", amount: 150, itemBreakdown: [{ description: "Paper", qty: 1, unitPrice: 150, lineAmount: 150 }] } });
  output = html(LogEntryModal);
  assert.match(output, /Review receipt/);
  assert.match(output, /Campus Store/);
  await find(render(LogEntryModal), n => n.type === "button" && text(n).includes("Confirm & Deduct")).props.onClick();
  assert.equal(confirms, 1);
  assert.equal(discards, 0, "confirmed receipts must not be discarded");
  reset();
  find(render(LogEntryModal), n => n.type === Upload).props.onParsed({ entryId: "entry-2", parsed: { documentTypeRaw: "Receipt", documentNumber: "124", issueDate: "2026-10-30", supplierName: "Campus Store", amount: 150, itemBreakdown: [] } });
  find(render(LogEntryModal), n => n.props?.["aria-label"] === "Close new entry").props.onClick();
  assert.equal(discards, 1, "closing an unconfirmed receipt preserves cleanup");
  assert.equal(closes, 2, "confirmation and close each dismiss the modal once");

  global.requestAnimationFrame = fn => fn();
  let outcome = "matched";
  global.fetch = async (_url, options) => {
    requests++;
    assert.equal(options.body.get("eventId"), "event-1");
    assert.equal(options.body.get("claimedAmount"), "5000");
    assert.equal(options.body.get("type"), "increase");
    return { ok: true, json: async () => ({ status: outcome, claimedAmount: 5000, extractedAmount: outcome === "matched" ? 5000 : 4000, resultingBudgetTotal: 25000 }) };
  };
  for (outcome of ["matched", "mismatch"]) {
    reset();
    tree = render(IncreaseBudgetModal);
    output = renderToStaticMarkup(tree);
    assert.match(output, /Add budget/);
    assert.match(output, /20,000.00/);
    assert.match(output, /additional funding, not the new budget total/);
    find(tree, n => n.type === "input" && n.props.id === "increase-budget").props.onChange({ target: { value: "5000", selectionStart: 4 } });
    await find(render(IncreaseBudgetModal), n => n.type === "form").props.onSubmit({ preventDefault() {} });
    assert.match(html(IncreaseBudgetModal), /Attach the funding document/);
    find(render(IncreaseBudgetModal), n => n.type === "input" && n.props.type === "file").props.onChange({ target: { files: [new File(["test"], "funding.jpg", { type: "image/jpeg" })] } });
    output = html(IncreaseBudgetModal);
    assert.match(output, /funding.jpg/);
    await find(render(IncreaseBudgetModal), n => n.type === "form").props.onSubmit({ preventDefault() {} });
    output = html(IncreaseBudgetModal);
    assert.match(output, outcome === "matched" ? /Budget verified and increased to/ : /nothing was added/);
    if (outcome === "matched") assert.match(output, /25,000.00/);
  }
  assert.equal(requests, 2, "missing proof must not submit");
  reset();
  const { ReceiptUpload: ActualReceiptUpload } = require("../components/entries/ReceiptUpload.tsx");
  const receiptHtml = renderToStaticMarkup(render(ActualReceiptUpload));
  assert.match(receiptHtml, /Drop your receipt here/);
  assert.match(receiptHtml, /Choose a photo/);
  assert.match(receiptHtml, /Maximum file size: 10 MB/);
  assert.match(receiptHtml, /lg:min-h-64/);
  const { ManualCategoryPicker: ActualPicker } = require("../components/entries/ManualCategoryPicker.tsx");
  const pickerHtml = renderToStaticMarkup(render(ActualPicker));
  assert.match(pickerHtml, /What kind of expense is this/);
  assert.match(pickerHtml, /Transportation/);
  assert.match(pickerHtml, /lg:rounded-2xl lg:border-border/);
  const { ReceiptFeedbackDialog } = require("../components/entries/ReceiptFeedbackDialog.tsx");
  const { Dialog } = require("@base-ui/react/dialog");
  let manual = 0, exhausted = 0, parsed = 0, pending = 0;
  const uploadProps = { onNoReceipt: () => { manual++; }, onExhausted: () => { exhausted++; }, onParsed: () => { parsed++; }, onPending: () => { pending++; } };
  for (const kind of ["invalid_document", "borderline", "multiple_documents", "generic", "exhausted"]) {
    reset();
    global.fetch = async () => ({ ok: kind === "exhausted", json: async () => kind === "exhausted" ? { status: "parsing", entry: { id: "pending-1" } } : { code: kind, error: "Please try a clearer photo." } });
    find(render(ActualReceiptUpload, uploadProps), n => n.type === "input").props.onChange({ target: { files: [new File(["test"], "receipt.jpg", { type: "image/jpeg" })] } });
    await find(render(ActualReceiptUpload, uploadProps), n => n.type === "button" && text(n).includes("Upload & Parse Receipt")).props.onClick();
    const feedback = find(render(ActualReceiptUpload, uploadProps), n => n.type === ReceiptFeedbackDialog);
    assert.equal(feedback.props.kind, kind);
    assert.equal(state[4], kind === "exhausted" ? 2 : 0, "verdicts do not consume retry attempts");
    const dialog = ReceiptFeedbackDialog(feedback.props);
    assert.equal(dialog.props.open, true);
    const popup = find(dialog, n => n.type === Dialog.Popup);
    assert.match(popup.props.className, /bg-surface/);
    assert.doesNotMatch(popup.props.className, /bg-warning|bg-info|hidden|sm:hidden/);
    assert(find(dialog, n => n.type === Dialog.Close), "touch screen readers have an explicit close control");
    const actions = [];
    function collect(node) { if (!node || typeof node !== "object") return; if (node.type === "button") actions.push(node); React.Children.toArray(node.props?.children).forEach(collect); }
    collect(dialog);
    assert.equal(actions.length, ["invalid_document", "borderline", "exhausted"].includes(kind) ? 2 : 1);
    if (kind === "invalid_document" || kind === "exhausted") {
      actions[0].props.onClick();
      assert.equal(find(render(ActualReceiptUpload, uploadProps), n => n.type === ReceiptFeedbackDialog).props.kind, null);
    } else {
      let prevented = false, stopped = false;
      popup.props.onKeyDown({ key: "Escape", preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
      assert(prevented && stopped, "Escape must not reach the underlying New Entry modal");
      assert.equal(find(render(ActualReceiptUpload, uploadProps), n => n.type === ReceiptFeedbackDialog).props.kind, null);
    }
  }
  assert.equal(manual, 1);
  assert.equal(exhausted, 1);
  assert.equal(parsed, 0, "failed parsing never calls the successful-entry handler");
  assert.equal(pending, 1);
  reset();
  global.fetch = async () => ({ ok: false, json: async () => ({ code: "invalid_document", error: "No details" }) });
  find(render(ActualReceiptUpload, uploadProps), n => n.type === "input").props.onChange({ target: { files: [new File(["test"], "receipt.jpg", { type: "image/jpeg" })] } });
  await find(render(ActualReceiptUpload, uploadProps), n => n.type === "button" && text(n).includes("Upload & Parse Receipt")).props.onClick();
  find(render(ActualReceiptUpload, uploadProps), n => n.type === ReceiptFeedbackDialog).props.onRetry();
  assert.equal(state[0], null, "Try Another Photo resets the selected image");
  reset();
  let retries = 0;
  global.fetch = async () => {
    retries++;
    return { ok: retries > 1, json: async () => retries > 1 ? { status: "parsed", entry: { id: "retry-entry" }, parsed: { amount: 150 } } : { error: "Connection interrupted" } };
  };
  find(render(ActualReceiptUpload, uploadProps), n => n.type === "input").props.onChange({ target: { files: [new File(["test"], "receipt.jpg", { type: "image/jpeg" })] } });
  await find(render(ActualReceiptUpload, uploadProps), n => n.type === "button" && text(n).includes("Upload & Parse Receipt")).props.onClick();
  find(render(ActualReceiptUpload, uploadProps), n => n.type === ReceiptFeedbackDialog).props.onRetry();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(retries, 2, "generic failure can retry the same photo");
  assert.equal(parsed, 1);
  assert.equal(closes, 2, "receipt guidance must not close New Entry underneath");
  for (const file of ["components/entries/LogEntryModal.tsx", "components/events/IncreaseBudgetModal.tsx"]) {
    const current = fs.readFileSync(path.join(root, file), "utf8");
    const original = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
    const sheet = source => source.slice(source.indexOf("<CssBottomSheet"), source.indexOf("</CssBottomSheet>") + 17).replace(/\r\n/g, "\n");
    assert.equal(sheet(current), sheet(original), `${file}: mobile sheet shell stays unchanged`);
    const begin = source => source.indexOf("export function");
    const end = file.includes("LogEntry") ? "  const screenContent =" : "  const formContent =";
    assert.equal(current.slice(begin(current), current.indexOf(end)).replace(/\r\n/g, "\n"), original.slice(begin(original), original.indexOf(end)).replace(/\r\n/g, "\n"), `${file}: existing state and submission handlers stay unchanged`);
  }
  console.log("Desktop modals: method selection, receipt review/confirm/cleanup, budget validation/verified/mismatch, mobile shells, and white receipt feedback with Escape isolation passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
