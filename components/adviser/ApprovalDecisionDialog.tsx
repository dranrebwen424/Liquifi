"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";

type ApprovalDecisionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  tone?: "approve" | "reject";
  reason?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  error?: string;
  busy?: boolean;
  onReasonChange?: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ApprovalDecisionDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel,
  tone = "approve",
  reason,
  reasonLabel,
  reasonPlaceholder,
  error,
  busy = false,
  onReasonChange,
  onClose,
  onConfirm,
}: ApprovalDecisionDialogProps) {
  const needsReason = reason !== undefined && onReasonChange !== undefined;
  const disabled = busy || (needsReason && reason.trim().length === 0);
  const confirmClass = tone === "reject"
    ? "border-error text-error hover:bg-error-lightest"
    : "bg-accent text-accent-foreground hover:bg-accent-hover";

  const renderBody = () => (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-error bg-error-lightest px-3 py-2 text-sm text-error-foreground">
          {error}
        </p>
      )}

      {needsReason && (
        <label className="block space-y-2">
          <span className="text-xs font-medium text-text-secondary">
            {reasonLabel ?? "Reason"}
          </span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            autoFocus
            placeholder={reasonPlaceholder ?? "Write a short reason…"}
            className="min-h-28 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={busy}
          className="rounded-full border-border bg-surface text-text-primary hover:bg-surface-secondary"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant={tone === "reject" ? "outline" : "default"}
          onClick={onConfirm}
          disabled={disabled}
          className={`rounded-full ${confirmClass}`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close dialog"
          className="fixed inset-0 z-50 bg-overlay-alpha"
          onClick={onClose}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-50 hidden items-center justify-center p-4 sm:flex">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card">
            {renderBody()}
          </div>
        </div>
      )}

      <CssBottomSheet open={open} onClose={onClose}>
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 shadow-card">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
          {renderBody()}
        </div>
      </CssBottomSheet>
    </>
  );
}
