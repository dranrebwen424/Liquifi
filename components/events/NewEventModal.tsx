"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

  const handleSubmit = async (name: string, budgetTotal: number) => {
    const result = await createEvent(name, budgetTotal);
    if (result.success) {
      onClose();
      router.refresh();
    } else {
      throw new Error(result.error);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          New Event
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Set up a new event budget to start tracking expenses.
        </p>
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
            <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card">
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
          <div className="min-h-0 overflow-y-auto p-6 pb-4">{formContent}</div>
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
