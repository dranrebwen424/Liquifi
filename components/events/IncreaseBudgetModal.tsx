"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Upload, FileImage, Loader2 } from "lucide-react";
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
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="lg:hidden">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 lg:gap-6">
          <div className="hidden items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 lg:flex">
            <div><p className="text-xs text-text-secondary">Current event budget</p><p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{formatPHP(currentBudget)}</p></div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-surface-secondary text-text-secondary"><Wallet className="size-5" aria-hidden="true" /></span>
          </div>
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
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent lg:rounded-xl lg:px-4 lg:py-4 lg:text-2xl lg:font-semibold lg:tabular-nums"
              required
            />
            <p className="mt-1 hidden text-xs leading-5 text-text-secondary lg:block">Enter the additional funding, not the new budget total.</p>
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
              className="inline-flex w-full items-center justify-center gap-2 truncate rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary lg:min-h-40 lg:flex-col lg:whitespace-normal lg:rounded-2xl lg:border-border-strong lg:p-6 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-2 lg:focus-visible:outline-accent"
            >
              <span className="mb-1 hidden size-12 items-center justify-center rounded-2xl bg-surface-secondary text-text-primary lg:flex"><Upload className="size-5" aria-hidden="true" /></span>
              {files.length > 0
                ? `Add another photo (${files.length} attached)`
                : "Attach funding letter or budget document"}
              <span className="hidden text-xs font-normal text-text-muted lg:block">JPG, PNG or WebP</span>
            </button>
            {files.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {files.map((image, i) => (
                  <li
                    key={`${image.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-text-secondary lg:rounded-xl lg:bg-surface lg:py-3"
                  >
                    <FileImage className="hidden size-5 shrink-0 text-text-secondary lg:block" aria-hidden="true" />
                    <span className="min-w-0 truncate lg:mr-auto">{image.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="shrink-0 rounded-full p-0.5 text-text-muted hover:text-error lg:flex lg:size-11 lg:items-center lg:justify-center lg:hover:bg-error-lightest lg:focus-visible:outline-2 lg:focus-visible:outline-accent"
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

          {error && <p className="text-sm text-error" role="alert">{error}</p>}

          <div className="lg:flex lg:items-center lg:justify-end lg:gap-3 lg:border-t lg:border-border lg:pt-6">
            <button type="button" onClick={done} className="hidden min-h-11 rounded-full border border-border bg-surface px-5 text-sm font-medium text-text-secondary hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent lg:inline-flex lg:items-center">Cancel</button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:min-w-44 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-2 lg:focus-visible:outline-accent"
          >
            {loading && <Loader2 className="hidden size-4 animate-spin lg:block" aria-hidden="true" />}
            {loading ? "Verifying…" : "Verify & Increase"}
          </button>
          </div>
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
              className="scrollbar-hide fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
            >
              <div role="dialog" aria-modal="true" aria-label="Add budget" className="scrollbar-hide relative w-full max-w-md lg:max-h-[85dvh] lg:overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-card lg:max-w-xl lg:rounded-3xl lg:p-0 lg:shadow-xl lg:shadow-overlay/10">
                <header className="hidden items-start gap-4 border-b border-border px-8 py-7 lg:flex">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary text-text-primary"><Wallet className="size-6" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">Event funding</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">Add budget</h2>
                    <p className="mt-1.5 text-sm leading-6 text-text-secondary">Increase your event funds with a supporting document.</p>
                  </div>
                  <button type="button" onClick={done} aria-label="Close add budget" className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"><X className="size-5" aria-hidden="true" /></button>
                </header>
                <button
                  type="button"
                  onClick={done}
                  className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary lg:hidden"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="lg:p-8">{formContent}</div>
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