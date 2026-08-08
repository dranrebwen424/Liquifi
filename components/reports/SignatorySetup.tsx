"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import type { ReportSignatoryRow } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────

type SignatorySetupProps = {
  eventId: string;
  generating: boolean;
  /** Called with the valid rows when the treasurer hits Generate Report. */
  onGenerate: (rows: ReportSignatoryRow[]) => void;
};

export const DEFAULT_SIGNATORIES: ReportSignatoryRow[] = [
  { position: "Adviser", full_name: "" },
  { position: "Treasurer", full_name: "" },
];

const storageKey = (eventId: string) => `liquifi:signatories:${eventId}`;

// ─── Form section (no modal chrome — rendered inline on the report page) ──

function readSavedList(eventId: string): ReportSignatoryRow[] | null {
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as ReportSignatoryRow[])
      : null;
  } catch {
    return null;
  }
}

export function SignatorySetup({ eventId, generating, onGenerate }: SignatorySetupProps) {
  // Read localStorage only after hydration (reading in the initializer would
  // mismatch the server render and corrupt the disabled state on the button).
  // The saved list is auto-applied on mount, so a cancelled report re-fills
  // the signatories without clicking "Reuse last list".
  const [signatories, setSignatories] =
    useState<ReportSignatoryRow[]>(DEFAULT_SIGNATORIES);

  useEffect(() => {
    const saved = readSavedList(eventId);
    if (saved) setSignatories(saved);
  }, [eventId]);

  const validRows = signatories.filter(
    (s) => s.position.trim() && s.full_name.trim(),
  );

  const persistSignatories = (rows: ReportSignatoryRow[]) => {
    try {
      localStorage.setItem(storageKey(eventId), JSON.stringify(rows));
    } catch {
      // quota exceeded — best-effort, same as usePeopleReuse
    }
  };

  const handleGenerate = () => {
    if (validRows.length === 0 || generating) return;
    persistSignatories(validRows);
    onGenerate(validRows);
  };

  const updateRow = (index: number, field: keyof ReportSignatoryRow, value: string) => {
    setSignatories((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () =>
    setSignatories((rows) => [...rows, { position: "", full_name: "" }]);

  const removeRow = (index: number) =>
    setSignatories((rows) =>
      rows.length > 1 ? rows.filter((_, i) => i !== index) : rows,
    );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Report Signatories
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Who will sign this report? Their names appear on the generated
          document.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {signatories.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={row.position}
                onChange={(e) => updateRow(index, "position", e.target.value)}
                placeholder="Position (e.g. Adviser)"
                disabled={generating}
                className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-50"
              />
              <input
                value={row.full_name}
                onChange={(e) => updateRow(index, "full_name", e.target.value)}
                placeholder="Full name"
                disabled={generating}
                className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={signatories.length <= 1 || generating}
              aria-label={`Remove ${row.position || "signatory"}`}
              className="mt-0.5 rounded-full p-2 text-text-muted transition-colors hover:bg-surface-secondary hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={generating}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add signatory
      </button>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || validRows.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Generate Report
          </>
        )}
      </button>
    </div>
  );
}
