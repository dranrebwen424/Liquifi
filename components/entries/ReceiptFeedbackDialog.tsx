"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FileQuestion, Pencil, RefreshCw, X } from "lucide-react";

export type ReceiptFeedbackKind = "generic" | "parse_failed" | "invalid_document" | "borderline" | "multiple_documents" | "exhausted";

type Props = {
  kind: ReceiptFeedbackKind | null;
  message: string;
  onClose: () => void;
  onRetry: () => void;
  onManual: () => void;
};

const TITLES: Record<ReceiptFeedbackKind, string> = {
  generic: "Could not upload this receipt",
  parse_failed: "Could not read this receipt",
  invalid_document: "No receipt details found",
  borderline: "Photo needs a retake",
  multiple_documents: "One receipt per upload",
  exhausted: "We couldn?t read this receipt",
};

export function ReceiptFeedbackDialog({ kind, message, onClose, onRetry, onManual }: Props) {
  const manualFirst = kind === "invalid_document" || kind === "exhausted";
  const canUseManual = manualFirst || kind === "borderline";
  const manualLabel = kind === "exhausted" ? "Enter entry manually" : "Log as No Receipt Entry";
  const retryLabel = kind === "generic" || kind === "parse_failed" ? "Try again" : "Try Another Photo";
  const PrimaryIcon = manualFirst ? Pencil : RefreshCw;

  return (
    <Dialog.Root open={kind !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop onPointerDown={(event) => event.stopPropagation()} className="fixed inset-0 z-[60] bg-overlay-alpha transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
          className="scrollbar-hide fixed left-1/2 top-1/2 z-[70] max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-overlay/10 outline-none transition-[opacity,scale] duration-200 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 motion-reduce:transition-none sm:p-7"
        >
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-text-primary"><FileQuestion className="size-5" aria-hidden="true" /></span>
            <Dialog.Title className="min-w-0 flex-1 self-center text-base font-semibold leading-5 text-text-primary sm:text-lg sm:leading-6">{kind ? TITLES[kind] : "Receipt guidance"}</Dialog.Title>
            <Dialog.Close aria-label="Dismiss receipt guidance" className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"><X className="size-4" aria-hidden="true" /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-4 text-xs leading-5 text-text-secondary sm:text-sm sm:leading-6">{message}</Dialog.Description>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={manualFirst ? onManual : onRetry} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-xs font-medium text-accent-foreground sm:text-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><PrimaryIcon className="size-4" aria-hidden="true" />{manualFirst ? manualLabel : retryLabel}</button>
            {canUseManual && <button type="button" onClick={manualFirst ? onRetry : onManual} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-xs font-medium text-text-primary sm:text-sm hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{manualFirst ? retryLabel : manualLabel}</button>}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
