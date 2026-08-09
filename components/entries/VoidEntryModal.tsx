"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/format";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import { voidEntry } from "@/actions/entries";
import { VOID_REASON_MAX } from "@/lib/limits";

type VoidTarget = {
  id: string;
  label: string;
  amount: number;
};

type VoidEntryModalProps = {
  open: boolean;
  entry: VoidTarget | null;
  onClose: () => void;
  /** Fired after a successful void (data already refreshed) — e.g. close a stale parent modal. */
  onSuccess?: () => void;
};

/**
 * Void a deducted entry — requires an explicit reason. Voiding is terminal and
 * rolls the entry out of spend totals; the row stays visible for audit.
 */
export function VoidEntryModal({ open, entry, onClose, onSuccess }: VoidEntryModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setBusy(false);
      setError(null);
      setDone(false);
    }
  }, [open, entry]);

  const submit = async () => {
    if (!entry) return;
    setBusy(true);
    setError(null);
    const result = await voidEntry(entry.id, reason.trim());
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    router.refresh();
    onSuccess?.();
  };

  const formContent = (target: VoidTarget) => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Void entry</h2>
          <p className="mt-0.5 text-sm text-text-muted">{target.label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Warning */}
      <div className="rounded-lg border border-error/30 bg-error-lightest p-3">
        <p className="text-sm font-medium text-error-foreground">
          {formatPHP(target.amount)} will be removed from this event&apos;s spend
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          This cannot be undone. The entry stays on the list, marked voided, for audit.
        </p>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {/* Reason */}
      <div className="space-y-1.5">
        <label htmlFor="void-reason" className="text-xs font-medium text-text-primary">
          Reason for voiding <span className="text-destructive">*</span>
        </label>
        <textarea
          id="void-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={VOID_REASON_MAX}
          placeholder="e.g. Charged to the wrong fund, cash returned, duplicate of receipt #…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
        />
        <p className="text-right text-xs text-text-muted">
          {reason.length}/{VOID_REASON_MAX}
        </p>
      </div>

      <Button
        variant="destructive"
        className="w-full"
        disabled={busy || reason.trim().length === 0}
        onClick={submit}
      >
        {busy ? "Voiding…" : "Void entry"}
      </Button>
    </div>
  );

  const successContent = () => (
    <div className="space-y-3 py-2 text-center">
      <p className="text-sm font-medium text-text-primary">Entry voided</p>
      <Button variant="outline" className="w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          {/* Overlay */}
          <motion.div
            key="void-overlay"
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={() => { if (!busy) onClose(); }}
          />

          {/* Web: centered modal */}
          <motion.div
            key="void-modal"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
          >
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card">
              {done ? successContent() : formContent(entry)}
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="void-sheet"
            variants={sheetSlideUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
          >
            <div className="flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-card">
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
              <div className="min-h-0 overflow-y-auto p-6 pb-4">
                {done ? successContent() : formContent(entry)}
              </div>
              {!done && (
                <div className="shrink-0 border-t border-border px-6 py-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                    className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
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