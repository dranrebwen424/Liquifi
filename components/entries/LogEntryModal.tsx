"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Camera, Pencil, FileText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/format";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";
import { ReceiptUpload } from "@/components/entries/ReceiptUpload";
import { ManualEntryForm } from "@/components/entries/ManualEntryForm";
import type { MockParsedReceipt } from "@/components/entries/ReceiptUpload";

type Method = "receipt" | "manual";

type LogEntryModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
};

export function LogEntryModal({ open, onClose, eventId }: LogEntryModalProps) {
  const [method, setMethod] = useState<Method>("receipt");
  const [parsedData, setParsedData] = useState<MockParsedReceipt | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setMethod("receipt");
      setParsedData(null);
      setReviewOpen(false);
      setConfirming(false);
    }
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onClose();
    },
    [onClose, confirming],
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

  const handleParsed = useCallback((data: MockParsedReceipt) => {
    setParsedData(data);
    setReviewOpen(true);
  }, []);

  const handleDiscard = useCallback(() => {
    setReviewOpen(false);
    setTimeout(() => setParsedData(null), 150);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!parsedData) return;
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 800));
    setConfirming(false);
    setReviewOpen(false);
    onClose();
  }, [parsedData, onClose]);

  // ─── Manual flow ───────────────────────────────────────────────

  const handleManualSubmit = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 600));
    onClose();
  }, [onClose]);

  // ─── Content ───────────────────────────────────────────────────

  /** Choose / upload / manual-entry screen */
  const screenContent = (
    <div className="flex flex-col gap-6">
      {/* Method toggle */}
      <div className="flex rounded-xl border border-border bg-surface p-1">
        {[
          { value: "receipt" as Method, label: "Upload Receipt", icon: Camera },
          { value: "manual" as Method, label: "No Receipt", icon: Pencil },
        ].map((opt) => {
          const active = method === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMethod(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
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

      {method === "receipt" ? (
        <ReceiptUpload onParsed={handleParsed} />
      ) : (
        <ManualEntryForm onSubmit={handleManualSubmit} />
      )}
    </div>
  );

  /** Receipt review — replaces screenContent inline */
  const reviewContent = parsedData && (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-lightest text-info">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-primary">
            Review Extracted Details
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            AI-parsed from receipt. If anything looks wrong, discard and re-upload.
          </p>
        </div>
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
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
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

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Check className="h-4 w-4" />
          {confirming ? "Confirming…" : "Confirm & Deduct"}
        </button>
        <button
          onClick={handleDiscard}
          disabled={confirming}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-error px-6 py-3 text-sm font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <X className="h-4 w-4" />
          Discard & Re-upload
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
            onClick={() => { if (!confirming) onClose(); }}
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
            <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {reviewOpen ? reviewContent : screenContent}
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="logentry-sheet"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
          >
            <div className="max-h-[85vh] rounded-t-2xl border-t border-border bg-surface shadow-card">
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
              <div className="overflow-y-auto p-6 pb-4">
                {reviewOpen ? reviewContent : screenContent}
              </div>
              {/* Persistent Cancel for mobile sheet */}
              {!reviewOpen && (
                <div className="border-t border-border px-6 py-3">
                  <button
                    type="button"
                    onClick={onClose}
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
