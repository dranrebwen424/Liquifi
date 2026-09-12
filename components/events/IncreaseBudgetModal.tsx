"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";
import { formatNumberInput, formatPHP } from "@/lib/format";

type IncreaseBudgetModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  currentBudget: number;
};

type Result =
  | { kind: "verified"; newTotal: number; claimed: number; extracted: number }
  | { kind: "mismatch"; claimed: number; extracted: number };

export function IncreaseBudgetModal({
  open,
  onClose,
  eventId,
  currentBudget,
}: IncreaseBudgetModalProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset the form each time the modal opens
  useEffect(() => {
    if (open) {
      setValue("");
      setFiles([]);
      setError("");
      setLoading(false);
      setResult(null);
    }
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") done();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose, router],
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

  // Refresh on any close — the budget may have changed.
  const done = () => {
    onClose();
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(value.replace(/,/g, ""));
    if (!value || isNaN(parsed) || parsed <= 0) {
      setError("Increase must be a positive amount.");
      return;
    }
    if (files.length === 0) {
      setError("Attach the funding document to verify this increase.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("eventId", eventId);
      fd.append("type", "increase");
      fd.append("claimedAmount", String(parsed));
      for (const image of files) {
        fd.append("image", image);
      }

      const res = await fetch("/api/proofs", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error ?? "Failed to verify the increase. Try again.");
        return;
      }
      if (body?.status === "matched") {
        setResult({
          kind: "verified",
          claimed: body.claimedAmount,
          extracted: body.extractedAmount,
          newTotal: body.resultingBudgetTotal,
        });
      } else {
        setResult({
          kind: "mismatch",
          claimed: body.claimedAmount,
          extracted: body.extractedAmount,
        });
      }
    } catch {
      setError("Failed to upload the document. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Increase Budget
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Add to the current budget with a verified funding document.
        </p>
      </div>

      {result ? (
        result.kind === "verified" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-success-light bg-success-lightest px-3 py-3">
              <p className="text-sm font-semibold text-success-foreground">
                Budget verified and increased to {formatPHP(result.newTotal)}.
              </p>
              <p className="mt-1 text-xs text-success-foreground/80">
                Document shows {formatPHP(result.extracted)} — matches your
                claimed {formatPHP(result.claimed)}.
              </p>
            </div>
            <button
              type="button"
              onClick={done}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-warning-light bg-warning-lightest px-3 py-3">
              <p className="text-sm font-semibold text-warning-foreground">
                The document doesn&apos;t match your amount — nothing was added.
              </p>
              <p className="mt-1 text-xs text-warning-foreground/80">
                Amount on document: {formatPHP(result.extracted)}. Amount
                entered: {formatPHP(result.claimed)}. Upload again with the
                correct amount.
              </p>
            </div>
            <button
              type="button"
              onClick={done}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        )
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="increase-budget"
              className="text-sm font-medium text-text-primary"
            >
              Increase Amount (₱)
            </label>
            <input
              id="increase-budget"
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
              placeholder="0.00"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Proof Document
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length) setFiles((prev) => [...prev, ...picked]);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 truncate rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
            >
              {files.length > 0
                ? `Add another photo (${files.length} attached)`
                : "Attach funding letter or budget document"}
            </button>
            {files.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {files.map((image, i) => (
                  <li
                    key={`${image.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-text-secondary"
                  >
                    <span className="min-w-0 truncate">{image.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="shrink-0 rounded-full p-0.5 text-text-muted hover:text-error"
                      aria-label={`Remove ${image.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-text-muted">
              Required — the amount on one of the documents must match your
              increase.
            </p>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify & Increase"}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="increasebudget-overlay"
              variants={dialogOverlay}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="fixed inset-0 z-50 bg-overlay-alpha"
              onClick={done}
            />

            {/* Web: centered modal */}
            <motion.div
              key="increasebudget-modal"
              variants={dialogContent}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
            >
              <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card">
                <button
                  type="button"
                  onClick={done}
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

      <CssBottomSheet open={open} onClose={done}>
        <div className="max-h-[85dvh] rounded-t-2xl border-t border-border bg-surface shadow-card">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="overflow-y-auto p-6 pb-4">{formContent}</div>
          <div className="border-t border-border px-6 py-3">
            <button
              type="button"
              onClick={done}
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