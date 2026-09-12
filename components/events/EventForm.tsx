"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { formatNumberInput } from "@/lib/format";

export type EventSubmitResult = {
  success: boolean;
  /** Fatal error when success=false. (Proofs are required — failure is fatal.) */
  message?: string;
};

type EventFormProps = {
  /** Called on submit. Defaults to mock behavior if omitted. */
  onSubmit?: (name: string, budgetTotal: number, proofFiles: File[]) => Promise<EventSubmitResult>;
};

export function EventForm({ onSubmit }: EventFormProps) {
  const [name, setName] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const budgetRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const removeProof = (index: number) => {
    setProofFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameTrimmed = name.trim();
    const parsed = parseFloat(budgetTotal.replace(/,/g, ""));

    if (!nameTrimmed) {
      setError("Event name is required.");
      return;
    }
    if (!budgetTotal || isNaN(parsed) || parsed <= 0) {
      setError("Budget must be a positive amount.");
      return;
    }
    if (proofFiles.length === 0) {
      setError("Budget proof is required.");
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        const result = await onSubmit(nameTrimmed, parsed, proofFiles);
        if (!result.success) {
          setError(result.message ?? "Failed to create event.");
        }
      } else {
        // ponytail: mock — simulate success
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch {
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Event name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="event-name"
          className="text-sm font-medium text-text-primary"
        >
          Event Name
        </label>
        <input
          id="event-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CCS Week 2026"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          required
        />
      </div>

      {/* Budget total */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="event-budget"
          className="text-sm font-medium text-text-primary"
        >
          Total Budget (₱)
        </label>
        <input
          id="event-budget"
          ref={budgetRef}
          type="text"
          inputMode="decimal"
          value={budgetTotal}
          onChange={(e) => {
            const raw = e.target.value;
            const cursor = e.target.selectionStart ?? raw.length;
            const pre = raw.slice(0, cursor).replace(/,/g, "").length;
            const formatted = formatNumberInput(raw);
            setBudgetTotal(formatted);
            requestAnimationFrame(() => {
              if (!budgetRef.current) return;
              // Find where the cursor should be after formatting by counting
              // how many commas appear before the pre-formatted cursor pos
              let newCursor = 0;
              let digitsSeen = 0;
              for (const ch of formatted) {
                if (digitsSeen >= pre) break;
                if (ch !== ",") digitsSeen++;
                newCursor++;
              }
              budgetRef.current.setSelectionRange(newCursor, newCursor);
            });
          }}
          placeholder="0.00"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          required
        />
        <p className="text-xs text-text-muted">
          You can increase this later with a verified budget proof.
        </p>
      </div>

      {/* Budget proof — required, verification evidence for the budget */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-primary">
          Budget Proof
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) setProofFiles((prev) => [...prev, ...picked]);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ImagePlus className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {proofFiles.length > 0
                ? `Add another photo (${proofFiles.length} attached)`
                : "Attach funding letter or budget document"}
            </span>
          </span>
        </button>
        {proofFiles.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {proofFiles.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-text-secondary"
              >
                <span className="min-w-0 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeProof(i)}
                  className="shrink-0 rounded-full p-0.5 text-text-muted hover:text-error"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-muted">
          Attach the funding approval that authorizes this budget. JPG, PNG, or
          WEBP, up to 5 photos.
        </p>
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Event"}
      </button>
    </form>
  );
}