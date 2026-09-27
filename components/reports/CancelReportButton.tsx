"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";

// Step 21 — real cancel of a pending report. Shared between the ephemeral
// generation preview and the persistent locked view. Two-step confirm;
// on success the server re-renders (router.refresh) so the page shows the
// unlocked flow + "was cancelled" banner.

type CancelReportButtonProps = {
  reportId: string;
  inverse?: boolean;
  /** Reset local client state before the server re-render (generation flow). */
  onCancelled?: () => void;
};

export function CancelReportButton({ reportId, onCancelled, inverse = false }: CancelReportButtonProps) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/cancel`, { method: "POST" });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to cancel the report.");
        setBusy(false);
        return;
      }
      onCancelled?.();
      router.refresh();
    } catch {
      setError("Failed to cancel the report. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${armed && inverse ? "col-span-2" : ""}`}>
      {armed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error-lightest p-3">
          <p className="text-xs text-text-secondary">
            Cancel this report and unlock the event for changes?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setArmed(false);
                setError(null);
              }}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Keep report
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleCancel}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-error px-4 py-2 text-xs font-medium text-error transition-colors hover:bg-error-light disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-error px-4 py-3 font-medium text-error transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error ${inverse ? "text-xs hover:bg-error/10" : "text-sm hover:bg-error-lightest sm:w-auto"}`}
        >
          <Ban className="h-3.5 w-3.5" aria-hidden />
          {inverse ? "Cancel" : "Cancel Report"}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
    </div>
  );
}
