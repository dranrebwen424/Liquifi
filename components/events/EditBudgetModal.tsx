"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import { formatNumberInput } from "@/lib/format";
import { updateEventBudget } from "@/actions/events";

type EditBudgetModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  currentBudget: number;
};

export function EditBudgetModal({ open, onClose, eventId, currentBudget }: EditBudgetModalProps) {
  const router = useRouter();
  const [value, setValue] = useState(formatNumberInput(String(currentBudget)));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset field to current budget each time the modal opens
  useEffect(() => {
    if (open) {
      setValue(formatNumberInput(String(currentBudget)));
      setError("");
      setLoading(false);
    }
  }, [open, currentBudget]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseFloat(value.replace(/,/g, ""));
    if (!value || isNaN(parsed) || parsed <= 0) {
      setError("Budget must be a positive amount.");
      return;
    }

    setLoading(true);
    const result = await updateEventBudget(eventId, parsed);
    setLoading(false);

    if (result.success) {
      onClose();
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Edit Budget</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Budget can be changed while the event has no entries yet. Once any expense
          is added, the budget becomes locked.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-budget" className="text-sm font-medium text-text-primary">
            Total Budget (₱)
          </label>
          <input
            id="edit-budget"
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              const cursor = e.target.selectionStart ?? raw.length;
              const pre = raw.slice(0, cursor).replace(/,/g, "").length;
              const formatted = formatNumberInput(raw);
              setValue(formatted);
              requestAnimationFrame(() => {
                if (!inputRef.current) return;
                let newCursor = 0;
                let digitsSeen = 0;
                for (const ch of formatted) {
                  if (digitsSeen >= pre) break;
                  if (ch !== ",") digitsSeen++;
                  newCursor++;
                }
                inputRef.current.setSelectionRange(newCursor, newCursor);
              });
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Budget"}
        </button>
      </form>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="editbudget-overlay"
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={onClose}
          />

          {/* Web: centered modal */}
          <motion.div
            key="editbudget-modal"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
          >
            <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card">
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
            key="editbudget-sheet"
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
              <div className="overflow-y-auto p-6 pb-4">{formContent}</div>
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
