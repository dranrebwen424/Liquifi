"use client";

import { Loader2, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode, RefObject } from "react";
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
  modal?: boolean;
  children?: ReactNode;
  reasonMaxLength?: number;
  finalFocus?: RefObject<HTMLElement | null>;
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
  modal = false,
  children,
  reasonMaxLength,
  finalFocus,
}: ApprovalDecisionDialogProps) {
  const needsReason = reason !== undefined && onReasonChange !== undefined;
  const disabled = busy || (needsReason && reason.trim().length === 0);
  const confirmClass = tone === "reject"
    ? "border-error text-error hover:bg-error-lightest"
    : "bg-accent text-accent-foreground hover:bg-accent-hover";
  const Title = modal ? Dialog.Title : "h2";
  const Description = modal ? Dialog.Description : "p";

  const renderBody = () => (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Title className="text-base font-semibold text-text-primary">{title}</Title>
          <Description className="mt-2 text-sm leading-6 text-text-secondary">{description}</Description>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-error bg-error-lightest px-3 py-2 text-sm text-error-foreground">
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
            required
            disabled={busy}
            maxLength={reasonMaxLength}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            autoFocus
            placeholder={reasonPlaceholder ?? "Write a short reason…"}
            className="min-h-28 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>
      )}

      {children}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={busy}
          className="min-h-11 rounded-full border-border bg-surface text-text-primary hover:bg-surface-secondary"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant={tone === "reject" ? "outline" : "default"}
          onClick={onConfirm}
          disabled={disabled}
          className={`min-h-11 rounded-full ${confirmClass}`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </div>
  );

  if (modal) {
    return (
      <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-overlay-alpha transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup finalFocus={finalFocus} aria-busy={busy}
            className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-card outline-none transition-[opacity,scale] duration-200 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 motion-reduce:transition-none">
            {renderBody()}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

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
