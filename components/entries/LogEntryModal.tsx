"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Camera,
  Pencil,
  FileText,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/format";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import { ReceiptUpload, type ParsedUploadResult } from "@/components/entries/ReceiptUpload";
import { ManualCategoryPicker } from "@/components/entries/ManualCategoryPicker";
import { ManualQuickForm, type ManualSubmitPayload } from "@/components/entries/ManualQuickForm";
import LottiePlayer from "@/components/LottiePlayer";
import { confirmReceiptEntry, discardReceiptEntry, submitManualEntry } from "@/actions/entries";
import type { ParsedReceipt } from "@/agent/types";
import type { ExpenseType } from "@/components/entries/manual-categories";

// ─── Types ─────────────────────────────────────────────────────────

type Method = "receipt" | "manual";
type ManualScreen = "picker" | "form" | "success";
type OverspendState = { overshoot: number; explanation: string; error: string | null };

type LogEntryModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
};

// ─── Component ─────────────────────────────────────────────────────

export function LogEntryModal({ open, onClose, eventId }: LogEntryModalProps) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("receipt");

  // Receipt flow state
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [overspend, setOverspend] = useState<OverspendState | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Manual flow state
  const [manualScreen, setManualScreen] = useState<ManualScreen>("picker");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseType | null>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setMethod("receipt");
      setParsedData(null);
      setEntryId(null);
      setReviewOpen(false);
      setConfirming(false);
      setDiscarding(false);
      setOverspend(null);
      setConfirmError(null);
      setManualScreen("picker");
      setSelectedCategory(null);
    }
  }, [open]);

  /**
   * Abandoned-review cleanup: an unconfirmed ai_parsed row is provisional —
   * closing the modal without confirming discards it (server-guarded).
   * entryId is nulled on confirm/discard, so post-action closes never discard.
   * Close waits for the delete so the refresh below lands after it — otherwise
   * the list behind re-renders before the row is gone and "discard does nothing".
   */
  const closeModal = useCallback(async () => {
    if (entryId && !discarding) {
      setDiscarding(true);
      await discardReceiptEntry(entryId, eventId);
      setDiscarding(false);
      router.refresh();
    }
    onClose();
  }, [entryId, discarding, eventId, onClose, router]);

  // Close on Escape (not during confirm or submit)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming && !discarding) closeModal();
    },
    [closeModal, confirming, discarding],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  // ─── Receipt flow ──────────────────────────────────────────────

  const handleParsed = useCallback(({ entryId: id, parsed }: ParsedUploadResult) => {
    setEntryId(id);
    setParsedData(parsed);
    setReviewOpen(true);
  }, []);

  const handleDiscard = useCallback(async () => {
    if (!entryId) return;
    setDiscarding(true);
    await discardReceiptEntry(entryId, eventId);
    setDiscarding(false);
    setEntryId(null);
    setReviewOpen(false);
    setOverspend(null);
    setConfirmError(null);
    router.refresh(); // row deleted (or raced a confirm) — sync the list behind
    setTimeout(() => setParsedData(null), 150);
  }, [entryId, eventId, router]);

  const handleConfirm = useCallback(async () => {
    if (!entryId || !parsedData) return;
    if (overspend && !overspend.explanation.trim()) {
      setOverspend((s) =>
        s ? { ...s, error: "An explanation is required to confirm the overspend." } : s,
      );
      return;
    }
    setConfirming(true);
    setConfirmError(null);
    const result = await confirmReceiptEntry(
      entryId,
      eventId,
      overspend ? { overspendExplanation: overspend.explanation } : undefined,
    );
    setConfirming(false);

    if (!result.success) {
      setConfirmError(result.error);
      return;
    }
    if ("overspendRequired" in result) {
      setOverspend({ overshoot: result.overshoot, explanation: "", error: null });
      return;
    }

    setReviewOpen(false);
    setOverspend(null);
    setEntryId(null); // entry is deducted — close directly, never via closeModal's discard path
    onClose();
    router.refresh();
  }, [entryId, parsedData, overspend, eventId, onClose, router]);

  // ─── Manual flow ───────────────────────────────────────────────

  const handleCategorySelect = useCallback((category: ExpenseType) => {
    setSelectedCategory(category);
    setManualScreen("form");
  }, []);

  const handleFormBack = useCallback(() => {
    setManualScreen("picker");
    setSelectedCategory(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: ManualSubmitPayload) => {
      const result = await submitManualEntry(eventId, data);
      // Both gates (explanationRequired, overspendRequired) are handled inside
      // ManualQuickForm — a success is only real when neither is present.
      if (result.success && !("explanationRequired" in result) && !("overspendRequired" in result)) {
        setManualScreen("success");
        router.refresh();
      }
      return result;
    },
    [eventId, router],
  );

  const handleLogAnother = useCallback(() => {
    setManualScreen("form");
    // Keep same category — ManualQuickForm resets its own fields via useEffect on category
  }, []);

  /** Jump from the receipt flow into Method 2 (exhausted fallback and invalid/borderline guidance). */
  const switchToManual = useCallback(() => {
    setMethod("manual");
    setManualScreen("picker");
    setSelectedCategory(null);
  }, []);

  // ─── Content: screens ──────────────────────────────────────────

  /** Method toggle + active method content */
  const screenContent = (
    <div className="flex flex-col gap-5">
      {/* Method toggle row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl border border-border bg-surface p-1">
          {[
            { value: "receipt" as Method, label: "Upload Receipt", icon: Camera },
            { value: "manual" as Method, label: "No Receipt", icon: Pencil },
          ].map((opt) => {
            const active = method === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMethod(opt.value);
                  setManualScreen("picker");
                  setSelectedCategory(null);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
        {/* Close button — web only */}
        <button
          type="button"
          onClick={closeModal}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary sm:flex"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Receipt flow */}
      {method === "receipt" && (
        <ReceiptUpload
          eventId={eventId}
          onParsed={handleParsed}
          onExhausted={switchToManual}
          onNoReceipt={switchToManual}
        />
      )}

      {/* Manual flow — screen state machine */}
      {method === "manual" && manualScreen === "picker" && (
        <ManualCategoryPicker onSelect={handleCategorySelect} />
      )}

      {method === "manual" && manualScreen === "form" && selectedCategory && (
        <ManualQuickForm
          category={selectedCategory}
          eventId={eventId}
          onBack={handleFormBack}
          onSubmit={handleFormSubmit}
        />
      )}

      {method === "manual" && manualScreen === "success" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <LottiePlayer
            src="/Auth%20pages/success.json"
            className="h-32 w-32"
            loop={false}
          />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-primary">
              Entry Submitted!
            </h3>
            <p className="mt-1.5 text-sm text-text-muted">
              Your department adviser will review this entry.
            </p>
          </div>
          <div className="mt-2 flex w-full flex-col gap-2.5 sm:flex-row">
            <button
              onClick={closeModal}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Close
            </button>
            <button
              onClick={handleLogAnother}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Log another{" "}
              {selectedCategory
                ? CATEGORY_LABELS[selectedCategory]
                : "entry"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /** Receipt review — replaces screenContent inline */
  const reviewContent = parsedData && (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-info-lightest text-info">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-primary">
            Review Extracted Details
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            AI-parsed from receipt. If anything looks wrong, discard and re-upload.
          </p>
        </div>
        <button
          type="button"
          onClick={closeModal}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary sm:flex"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Extracted fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Document Type" value={parsedData.documentTypeRaw} />
        <ReadOnlyField label="Document Number" value={parsedData.documentNumber} />
        <ReadOnlyField label="Issue Date" value={parsedData.issueDate} />
        <ReadOnlyField label="Issue Time" value={parsedData.issueTime ?? "—"} />
        <div className="sm:col-span-2">
          <ReadOnlyField label="Supplier / Payee" value={parsedData.supplierName} />
        </div>
        <div className="sm:col-span-2">
          <ReadOnlyField label="Total Amount" value={formatPHP(parsedData.amount)} highlighted />
        </div>
      </div>

      {/* Itemized breakdown */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Itemized Breakdown
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-text-muted">Description</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">Unit Price</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">Amount</th>
              </tr>
            </thead>
            <tbody>
              {parsedData.itemBreakdown.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text-primary">{item.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-primary">{item.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-primary">{formatPHP(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-primary">{formatPHP(item.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-strong bg-surface-secondary font-medium">
                <td colSpan={3} className="px-3 py-2 text-right text-text-primary">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-primary">{formatPHP(parsedData.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Overspend warning — required explanation before deducting */}
      {overspend && (
        <div className="rounded-xl border border-warning bg-warning-lightest p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                This will put the event {formatPHP(overspend.overshoot)} over budget
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Explain why this expense was necessary — the adviser will see it on the report.
              </p>
              <textarea
                value={overspend.explanation}
                onChange={(e) =>
                  setOverspend((s) =>
                    s ? { ...s, explanation: e.target.value, error: null } : s,
                  )
                }
                rows={3}
                maxLength={500}
                placeholder="Why was this expense necessary?"
                aria-label="Overspend explanation"
                className="mt-3 w-full resize-none rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
              {overspend.error && (
                <p className="mt-1.5 text-xs font-medium text-error">{overspend.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm error — guards / server rejection */}
      {confirmError && (
        <p className="text-xs font-medium text-error" role="alert">{confirmError}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Check className="h-4 w-4" />
          {confirming ? "Confirming…" : overspend ? "Confirm Overspend" : "Confirm & Deduct"}
        </button>
        <button
          onClick={handleDiscard}
          disabled={confirming || discarding}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-error px-6 py-3.5 text-sm font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <X className="h-4 w-4" />
          {discarding ? "Discarding…" : "Discard & Re-upload"}
        </button>
      </div>
    </div>
  );

  // ─── Modal / Sheet shell ───────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="logentry-overlay"
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={() => { if (!confirming && !discarding) closeModal(); }}
          />

          {/* Web: centered modal */}
          <motion.div
            key="logentry-modal"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
          >
            <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-card">
              {reviewOpen ? reviewContent : screenContent}
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="logentry-sheet"
            variants={sheetSlideUp}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) closeModal();
            }}
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
          >
            <div className="flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-card">
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
              <div className="min-h-0 overflow-y-auto p-6 pb-4">
                {reviewOpen ? reviewContent : screenContent}
              </div>
              {/* Persistent Cancel for mobile sheet — only when not in receipt review */}
              {!reviewOpen && method === "receipt" && (
                <div className="shrink-0 border-t border-border px-6 py-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Category label map ────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  transportation: "Transportation",
  meals: "Meals",
  honorarium: "Honorarium",
  supplies: "Supplies",
  printing: "Printing",
  rental: "Rental",
  others: "Other",
};

// ─── Read-Only Field Atom ─────────────────────────────────────────

function ReadOnlyField({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {highlighted ? (
        <span className="rounded-lg bg-info-lightest px-3 py-2 text-sm font-semibold text-info-foreground">
          {value}
        </span>
      ) : (
        <span className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary">
          {value}
        </span>
      )}
    </div>
  );
}
