"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, FileText } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";
import type { MockParsedReceipt } from "@/components/entries/ReceiptUpload";

type ReceiptReviewProps = {
  open: boolean;
  data: MockParsedReceipt;
  onConfirm: () => void;
  onDiscard: () => void;
  onClose: () => void;
  confirming?: boolean;
};

export function ReceiptReview({
  open,
  data,
  onConfirm,
  onDiscard,
  onClose,
  confirming = false,
}: ReceiptReviewProps) {
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

  const content = (
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
            AI-parsed from receipt — read-only. If anything looks wrong, discard and re-upload.
          </p>
        </div>
      </div>

      {/* Extracted fields — read-only */}
      <div className="flex flex-col gap-4">
        {/* Two-column grid for basic fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Document Type" value={data.documentTypeRaw} />
          <ReadOnlyField label="Document Number" value={data.documentNumber} />
          <ReadOnlyField label="Issue Date" value={data.issueDate} />
          <ReadOnlyField
            label="Issue Time"
            value={data.issueTime ?? "—"}
          />
          <div className="sm:col-span-2">
            <ReadOnlyField label="Supplier / Payee" value={data.supplierName} />
          </div>
          <div className="sm:col-span-2">
            <ReadOnlyField
              label="Total Amount"
              value={formatPHP(data.amount)}
              highlighted
            />
          </div>
        </div>

        {/* Item breakdown table */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Itemized Breakdown
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                    Unit Price
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.itemBreakdown.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text-primary">{item.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {item.qty}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {formatPHP(item.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {formatPHP(item.lineAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border-strong bg-surface-secondary font-medium">
                  <td colSpan={3} className="px-3 py-2 text-right text-text-primary">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                    {formatPHP(data.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          onClick={onConfirm}
          disabled={confirming}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Check className="h-4 w-4" />
          {confirming ? "Confirming…" : "Confirm & Deduct"}
        </button>
        <button
          onClick={onDiscard}
          disabled={confirming}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-error px-6 py-3 text-sm font-medium text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <X className="h-4 w-4" />
          Discard & Re-upload
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="review-overlay"
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={() => { if (!confirming) onClose(); }}
          />

          {/* Web: centered modal */}
          <motion.div
            key="review-modal"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
          >
            <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card">
              {content}
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="review-sheet"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
          >
            <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card">
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
              {content}
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
