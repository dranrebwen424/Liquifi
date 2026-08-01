"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Pencil, ZoomIn, CircleMinus } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { StatusBadge, entryStatusMap } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import type { EntryType, EntryStatus } from "@/types";

type EntryDetail = {
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
  createdAt?: string;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedAt?: string | null;
};

type EntryDetailModalProps = {
  open: boolean;
  onClose: () => void;
  entry: EntryDetail;
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

type ItemRow = {
  description?: string;
  quantity?: number;
  unit_price?: number;
  line_amount?: number;
};

function isItemBreakdown(val: unknown): val is ItemRow[] {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && "description" in (val[0] as Record<string, unknown>);
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

/** Full detail content — shared between modal and sheet. */
function EntryDetailContent({
  entry,
  onViewImage,
}: {
  entry: EntryDetail;
  onViewImage?: () => void;
}) {
  const isVoided = entry.status === "voided";
  const displayName = entry.supplierName || entry.description || "Untitled entry";
  const title = entry.supplierName ? entry.description : null;
  const itemBreakdown = isItemBreakdown(entry.itemBreakdown) ? entry.itemBreakdown : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Image area */}
      {entry.type === "receipt" ? (
        <ReceiptImagePlaceholder onClick={onViewImage} />
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
                      {item.description ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {item.quantity ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                      {item.unit_price != null ? formatPHP(item.unit_price) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-text-primary">
                      {item.line_amount != null ? formatPHP(item.line_amount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Void info */}
      {isVoided && entry.voidReason && (
        <div className="rounded-lg border border-error/30 bg-error-lightest p-3">
          <p className="text-xs font-medium text-error-foreground">
            Voided{entry.voidedBy ? ` by ${entry.voidedBy}` : ""}
            {entry.voidedAt ? ` on ${formatDate(entry.voidedAt)}` : ""}
          </p>
          <p className="mt-1 text-sm text-text-primary">{entry.voidReason}</p>
        </div>
      )}
    </div>
  );
}

/** Full-screen image viewer. */
function ImageViewer({
  open,
  onClose,
}: {
  open: boolean;
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
          {/* Placeholder — would be actual image */}
          <div className="flex h-[70vh] w-[80vw] max-w-2xl flex-col items-center justify-center rounded-xl bg-white p-8">
            <FileText className="mb-4 h-20 w-20 text-text-muted/30" />
            <p className="text-sm text-text-muted">Receipt image preview</p>
            <p className="mt-1 text-xs text-text-muted">
              Full image will render here when receipt is uploaded
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EntryDetailModal({ open, onClose, entry }: EntryDetailModalProps) {
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
      <ImageViewer open={imageOpen} onClose={() => setImageOpen(false)} />

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

                <div className="max-h-[85vh] overflow-y-auto rounded-xl p-6 pt-12">
                  <EntryDetailContent
                    entry={entry}
                    onViewImage={() => setImageOpen(true)}
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
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-card sm:hidden"
            >
              {/* Drag handle */}
              <div className="mx-auto mb-5 mt-3 h-1 w-10 rounded-full bg-border-strong" />

              <div className="p-6 pb-8 pt-0">
                <EntryDetailContent
                  entry={entry}
                  onViewImage={() => setImageOpen(true)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
