"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Pencil, ZoomIn, CircleMinus, CircleX } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { StatusBadge, entryStatusMap } from "@/components/ui/StatusBadge";
import { entryTitle } from "@/components/entries/entry-title";
import { Button } from "@/components/ui/button";
import { resubmitEntry, withdrawPendingEntry } from "@/actions/entries";
import { cn } from "@/lib/utils";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import type { EntryType, EntryStatus } from "@/types";

type EntryDetail = {
  id: string;
  type: EntryType;
  status: EntryStatus;
  amount: number;
  description?: string | null;
  supplierName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  category?: string | null;
  issueDate?: string | null;
  issueTime?: string | null;
  imageUrl?: string | null;
  itemBreakdown?: unknown;
  formPayload?: unknown;
  rejectionReason?: string | null;
  resubmissionExplanation?: string | null;
  createdAt?: string;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedAt?: string | null;
  voidedByName?: string | null;
};

type EntryDetailModalProps = {
  open: boolean;
  onClose: () => void;
  entry: EntryDetail;
  /** Treasurer with mutate rights on this event — enables the void action. */
  canMutate?: boolean;
  /** Opens the void confirmation modal for this entry. */
  onVoid?: () => void;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  return timeStr;
}

type NormalizedItem = {
  description: string;
  qty: number | null;
  unitPrice: number | null;
  lineAmount: number | null;
};

function toNumberOrNull(v: unknown): number | null {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v)
        : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Stored shapes differ: receipts = camelCase (qty/unitPrice/lineAmount, verbatim
 *  from the Gemini zod schema), manual = snake_case (qty/unit_price/line_amount). */
function normalizeItem(raw: Record<string, unknown>): NormalizedItem {
  return {
    description: typeof raw.description === "string" ? raw.description : "",
    qty: toNumberOrNull(raw.qty ?? raw.quantity),
    unitPrice: toNumberOrNull(raw.unitPrice ?? raw.unit_price),
    lineAmount: toNumberOrNull(raw.lineAmount ?? raw.line_amount),
  };
}

function isItemBreakdown(val: unknown): val is Record<string, unknown>[] {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    typeof val[0] === "object" &&
    val[0] !== null &&
    "description" in (val[0] as Record<string, unknown>)
  );
}

/** Receipt image placeholder (larger version for modal). */
function ReceiptImagePlaceholder({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-48 w-full flex-col items-center justify-center rounded-lg border border-border bg-surface p-4",
        onClick && "cursor-pointer hover:bg-surface-secondary",
      )}
    >
      <FileText className="mb-2 h-12 w-12 text-text-muted/40" />
      <p className="text-xs text-text-muted">Receipt image</p>
      {onClick && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-text-muted">
          <ZoomIn className="h-3 w-3" /> Click to view
        </p>
      )}
    </div>
  );
}

/** Manual entry icon (larger version for modal). */
function ManualImagePlaceholder() {
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-lg border border-border bg-surface-secondary">
      <Pencil className="h-12 w-12 text-text-muted/40" />
    </div>
  );
}

/** Detail row — label + value pair. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

/** Resubmit action for a rejected entry (treasurer). No discard/withdraw — a
 *  decided entry is a permanent record; the only path forward is resubmit. */
function RejectedEntryActions({ entryId, terminal }: { entryId: string; terminal: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "resubmit">("idle");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setDone(successMessage);
    router.refresh(); // list badge rejected → resubmitted
  };

  const doResubmit = () =>
    run(() => resubmitEntry(entryId, explanation.trim()), "Entry resubmitted — sent back to your adviser for review.");

  if (done) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-surface-secondary p-3">
        <p className="text-sm font-medium text-text-primary">{done}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {mode === "idle" && terminal && (
        <div className="rounded-lg border border-error/30 bg-error-lightest p-3">
          <p className="text-xs font-medium text-error-foreground">Rejected permanently</p>
          <p className="mt-1 text-sm text-text-primary">
            This entry was rejected after resubmission and can no longer be submitted. It stays
            on record for audit.
          </p>
        </div>
      )}

      {mode === "idle" && !terminal && (
        <Button size="sm" onClick={() => setMode("resubmit")} disabled={busy}>
          Resubmit with explanation
        </Button>
      )}

      {mode === "resubmit" && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
          <label htmlFor="resubmit-explanation" className="text-xs font-medium text-text-primary">
            Explain why this entry should be reconsidered
          </label>
          <textarea
            id="resubmit-explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Address the adviser's reason for rejection…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={doResubmit}
              disabled={busy || explanation.trim().length === 0}
            >
              {busy ? "Submitting…" : "Submit resubmission"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode("idle")} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Withdraw action for a manual entry awaiting first adviser review (treasurer).
 *  Withdrawing hard-deletes the row — nothing irreversible had happened yet. */
function WithdrawEntryActions({
  entryId,
  onWithdrawn,
}: {
  entryId: string;
  onWithdrawn?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const doWithdraw = async () => {
    setBusy(true);
    setError(null);
    const result = await withdrawPendingEntry(entryId);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh(); // row is gone — drop it from the list behind
    if (onWithdrawn) {
      onWithdrawn(); // close the detail modal — the entry no longer exists
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-surface-secondary p-3">
        <p className="text-sm font-medium text-text-primary">Entry withdrawn and removed.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {!confirming ? (
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <CircleX className="h-3.5 w-3.5" />
          Withdraw entry
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border border-error/30 bg-error-lightest p-3">
          <p className="text-sm text-text-primary">
            Withdraw this entry permanently? It will be deleted and removed from your
            adviser&apos;s review queue. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={doWithdraw}
              disabled={busy}
            >
              {busy ? "Withdrawing…" : "Yes, withdraw"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
              Keep entry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full detail content — shared between modal and sheet. */
function EntryDetailContent({
  entry,
  canMutate,
  onVoid,
  onViewImage,
  onWithdrawn,
}: {
  entry: EntryDetail;
  canMutate?: boolean;
  onVoid?: () => void;
  onViewImage?: () => void;
  onWithdrawn?: () => void;
}) {
  const isVoided = entry.status === "voided";
  const displayName = entryTitle(entry);
  const title = entry.supplierName ? entry.description : null;
  const itemBreakdown = isItemBreakdown(entry.itemBreakdown)
    ? entry.itemBreakdown.map(normalizeItem)
    : null;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(entry.imageUrl) && !imgFailed;

  return (
    <div className="flex flex-col gap-4">
      {/* Image area */}
      {entry.type === "receipt" ? (
        showImage ? (
          <img
            src={`/api/entries/${entry.id}/image`}
            alt={displayName}
            onClick={onViewImage}
            onError={() => setImgFailed(true)}
            className="h-48 w-full cursor-pointer rounded-lg border border-border object-cover hover:opacity-90"
          />
        ) : (
          <ReceiptImagePlaceholder onClick={onViewImage} />
        )
      ) : (
        <ManualImagePlaceholder />
      )}

      {/* Supplier + title */}
      <div>
        <p
          className={cn(
            "text-base font-semibold text-text-primary",
            isVoided && "line-through",
          )}
        >
          {displayName}
        </p>
        {title && (
          <p className="mt-0.5 text-sm text-text-muted">{title}</p>
        )}
      </div>

      {/* Amount + Status */}
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            isVoided ? "text-text-muted line-through" : "text-text-primary",
          )}
        >
          {formatPHP(entry.amount)}
        </p>
        <StatusBadge
          icon={entryStatusMap[entry.status]?.icon ?? CircleMinus}
          variant={entryStatusMap[entry.status]?.variant ?? "neutral"}
          label={entryStatusMap[entry.status]?.label ?? entry.status}
        />
      </div>

      {/* Detail rows */}
      <div className="divide-y divide-border rounded-lg border border-border bg-surface-secondary/50 px-4">
        {entry.documentNumber && (
          <DetailRow label="Document #" value={entry.documentNumber} />
        )}
        {entry.documentType && (
          <DetailRow label="Document Type" value={entry.documentType} />
        )}
        {entry.issueDate && (
          <DetailRow label="Date" value={formatDate(entry.issueDate)} />
        )}
        {entry.issueTime && (
          <DetailRow label="Time" value={formatTime(entry.issueTime)} />
        )}
        {entry.category && (
          <DetailRow label="Category" value={entry.category} />
        )}
        <DetailRow
          label="Type"
          value={entry.type === "receipt" ? "Receipt" : "Manual"}
        />
        {entry.createdAt && (
          <DetailRow label="Created" value={formatDate(entry.createdAt)} />
        )}
      </div>

      {/* Item breakdown */}
      {itemBreakdown && itemBreakdown.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Item Breakdown
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-xs text-text-muted">
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {itemBreakdown.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2 text-text-primary">
                      {item.description || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {item.qty ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {item.unitPrice != null ? formatPHP(item.unitPrice) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-text-primary">
                      {item.lineAmount != null ? formatPHP(item.lineAmount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection info */}
      {entry.status === "rejected" && entry.rejectionReason && (
        <div className="rounded-lg border border-error/30 bg-error-lightest p-3">
          <p className="text-xs font-medium text-error-foreground">Rejected</p>
          <p className="mt-1 text-sm text-text-primary">{entry.rejectionReason}</p>
        </div>
      )}

      {/* Resubmission note */}
      {entry.status === "resubmitted" && entry.resubmissionExplanation && (
        <div className="rounded-lg border border-border bg-surface-secondary p-3">
          <p className="text-xs font-medium text-text-muted">Resubmission note</p>
          <p className="mt-1 text-sm text-text-primary">{entry.resubmissionExplanation}</p>
        </div>
      )}

      {/* Resubmit / discard actions — rejected entries only, treasurer only.
          (Adviser/admin see rejection info above but never these actions.) */}
      {canMutate && entry.status === "rejected" && (
        <RejectedEntryActions
          entryId={entry.id}
          terminal={Boolean(entry.resubmissionExplanation)}
        />
      )}

      {/* Withdraw — manual entry awaiting first adviser review, treasurer only.
          Rejected/resubmitted entries are NOT withdrawable (permanent audit record). */}
      {canMutate && entry.status === "pending_approval" && (
        <WithdrawEntryActions entryId={entry.id} onWithdrawn={onWithdrawn} />
      )}

      {/* Void info */}
      {isVoided && entry.voidReason && (
        <div className="rounded-lg border border-error/30 bg-error-lightest p-3">
          <p className="text-xs font-medium text-error-foreground">
            Voided{entry.voidedByName ? ` by ${entry.voidedByName}` : ""}
            {entry.voidedAt ? ` on ${formatDate(entry.voidedAt)}` : ""}
          </p>
          <p className="mt-1 text-sm text-text-primary">{entry.voidReason}</p>
        </div>
      )}

      {/* Void action — deducted entries only, treasurer only */}
      {canMutate && !isVoided && entry.status === "deducted" && (
        <Button
          variant="destructive"
          className="w-full rounded-full"
          onClick={onVoid}
        >
          <CircleX className="h-4 w-4" />
          Void entry
        </Button>
      )}
    </div>
  );
}

/** Full-screen image viewer. */
function ImageViewer({
  open,
  src,
  onClose,
}: {
  open: boolean;
  src?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset error state when a new image is shown
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          {src && !failed ? (
            <img
              src={src}
              alt="Receipt"
              onError={() => setFailed(true)}
              className="max-h-[80vh] w-auto max-w-[90vw] rounded-xl object-contain"
            />
          ) : (
            /* Placeholder — when no image is available */
            <div className="flex h-[70vh] w-[80vw] max-w-2xl flex-col items-center justify-center rounded-xl bg-white p-8">
              <FileText className="mb-4 h-20 w-20 text-text-muted/30" />
              <p className="text-sm text-text-muted">Receipt image preview</p>
              <p className="mt-1 text-xs text-text-muted">
                No image available for this entry
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EntryDetailModal({ open, onClose, entry, canMutate, onVoid }: EntryDetailModalProps) {
  const [imageOpen, setImageOpen] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Image viewer */}
      <ImageViewer
        open={imageOpen}
        src={entry.type === "receipt" && entry.imageUrl ? `/api/entries/${entry.id}/image` : undefined}
        onClose={() => setImageOpen(false)}
      />

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              variants={dialogOverlay}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="fixed inset-0 z-50 bg-overlay-alpha"
              onClick={onClose}
            />

            {/* Desktop modal */}
            <motion.div
              variants={dialogContent}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-50 hidden items-center justify-center p-4 sm:flex"
            >
              <div className="relative max-h-[85vh] w-full max-w-lg rounded-xl border border-border bg-surface shadow-card">
                {/* Close button — outside scrollable area */}
                <button
                  onClick={onClose}
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-text-muted shadow-sm hover:bg-surface-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="max-h-[85vh] scrollbar-hide overflow-y-auto rounded-xl p-6 pt-12">
                  <EntryDetailContent
                    entry={entry}
                    canMutate={canMutate}
                    onVoid={onVoid}
                    onViewImage={() => setImageOpen(true)}
                    onWithdrawn={onClose}
                  />
                </div>
              </div>
            </motion.div>

            {/* Mobile bottom sheet */}
            <motion.div
              variants={sheetSlideUp}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] scrollbar-hide overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-card sm:hidden"
            >
              {/* Drag handle */}
              <div className="mx-auto mb-5 mt-3 h-1 w-10 rounded-full bg-border-strong" />

              <div className="p-6 pb-8 pt-0">
                <EntryDetailContent
                  entry={entry}
                  canMutate={canMutate}
                  onVoid={onVoid}
                  onViewImage={() => setImageOpen(true)}
                  onWithdrawn={onClose}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
