"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "@/actions/events";

type NewEventModalProps = {
  open: boolean;
  onClose: () => void;
};

export function NewEventModal({ open, onClose }: NewEventModalProps) {
  const router = useRouter();

  const closeSheet = useCallback(() => onClose(), [onClose]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    },
    [closeSheet],
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

  const handleSubmit = async (
    name: string,
    budgetTotal: number,
    proofFiles: File[],
  ) => {
    const result = await createEvent(name, budgetTotal);
    if (!result.success) {
      return { success: false, message: result.error };
    }

    if (proofFiles.length === 0) {
      // Required field — server + form both enforce; this is the last line.
      return { success: false, message: "Budget proof is required." };
    }

    // Initial proof — posted AFTER the event row exists so the budget row is
    // always rooted in a durable event. Any failure here is fatal: the server
    // rolls the event back, so the form reports a hard error and stays open.
    const fd = new FormData();
    fd.append("eventId", result.eventId);
    fd.append("type", "initial");
    fd.append("claimedAmount", String(budgetTotal));
    for (const file of proofFiles) {
      fd.append("image", file);
    }
    try {
      const res = await fetch("/api/proofs", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          message:
            body?.error ??
            "The budget proof couldn't be verified — the event was not created.",
        };
      }
    } catch {
      return {
        success: false,
        message: "The proof upload failed — the event was not created. Try again.",
      };
    }

    onClose();
    router.refresh();
    return { success: true };
  };

  const formContent = (
    <div className="flex flex-col gap-5">
      <div className="space-y-4">
        <div className="flex items-start gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-light text-accent">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Create
            </p>
            <h2 className="text-lg font-semibold text-text-primary">
              New event
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Name it, set budget, attach proof.
            </p>
          </div>
        </div>
      </div>
      <EventForm onSubmit={handleSubmit} />
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
          {/* Overlay */}
          <motion.div
            key="newevent-overlay"
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={closeSheet}
          />

          {/* Web: centered modal */}
          <motion.div
            key="newevent-modal"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
          >
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-7">
              <button
                type="button"
                onClick={closeSheet}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {formContent}
            </div>
          </motion.div>

          </>
        )}
      </AnimatePresence>

      <CssBottomSheet open={open} onClose={closeSheet}>
        <div className="flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-card">
          <div className="flex shrink-0 flex-col items-center py-3">
            <div className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
          <div className="min-h-0 overflow-y-auto px-5 pb-4 pt-2 sm:px-6">{formContent}</div>
          <div className="border-t border-border px-6 py-3">
            <button
              type="button"
              onClick={closeSheet}
              className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </CssBottomSheet>
    </>
  );
}
