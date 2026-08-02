"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "@/actions/events";

type NewEventModalProps = {
  open: boolean;
  onClose: () => void;
};

export function NewEventModal({ open, onClose }: NewEventModalProps) {
  const router = useRouter();

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
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
            onClick={onClose}
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
                onClick={onClose}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {formContent}
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="newevent-sheet"
            variants={sheetSlideUp}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
          >
            <div className="max-h-[85vh] rounded-t-2xl border-t border-border bg-surface shadow-card">
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
              <div className="overflow-y-auto p-6 pb-4">
                {formContent}
              </div>
              <div className="border-t border-border px-6 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
