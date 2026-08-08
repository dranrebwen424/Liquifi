"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SignatorySetup } from "@/components/reports/SignatorySetup";
import { CancelReportButton } from "@/components/reports/CancelReportButton";
import { PdfViewer } from "@/components/reports/PdfViewer";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";
import type { ReportSignatoryRow } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────

type Screen = "setup" | "generating" | "preview";

type ReportGenerationFlowProps = {
  eventId: string;
  /** Non-blocking report already on file for this event (rejected/cancelled) — regeneration allowed. */
  previousReport?: { fs_document_number: string; status: string } | null;
};

// ─── Component — owns the setup → generating → preview state machine ──

export function ReportGenerationFlow({ eventId, previousReport }: ReportGenerationFlowProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("setup");
  const [signatories, setSignatories] = useState<ReportSignatoryRow[]>([]);
  const [fsNumber, setFsNumber] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (rows: ReportSignatoryRow[]) => {
    setSignatories(rows);
    setError(null);
    setScreen("generating");

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, signatories: rows }),
      });
      const json = (await res.json()) as
        | { success: true; report: { id: string; fs_document_number: string } }
        | { success: false; error: string };

      if (!res.ok || !json.success) {
        setError(json.success === false ? json.error : "Failed to generate the report.");
        setScreen("setup");
        return;
      }

      setFsNumber(json.report.fs_document_number);
      setReportId(json.report.id);
      setScreen("preview"); // briefly — the refresh below replaces this card
      // Re-render the server page: the new report is now the latest (pending →
      // locked viewer-first state). Without this the superseded report's PDF
      // stays visible below with its old signatories.
      router.refresh();
    } catch {
      setError("Failed to generate the report. Try again.");
      setScreen("setup");
    }
  };

  const handleCancelled = () => {
    // Leave the preview; the router.refresh from CancelReportButton re-renders
    // the server page unlocked, with this report as previousReport (cancelled).
    setScreen("setup");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Step 19 flavor: banner for regeneration after rejection/cancellation */}
      {previousReport && screen === "setup" && (
        <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
          Previous report {previousReport.fs_document_number} was{" "}
          {previousReport.status.replace(/_/g, " ")}. Regenerating creates a new
          revision of the same FS number.
        </div>
      )}

      {error && screen === "setup" && (
        <div className="rounded-xl border border-error/30 bg-error-lightest px-4 py-3 text-xs text-text-secondary">
          {error}
        </div>
      )}

      {screen === "setup" && (
        <SignatorySetup eventId={eventId} generating={false} onGenerate={handleGenerate} />
      )}

      {screen === "generating" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium text-text-primary">Generating report…</p>
          <p className="text-xs text-text-muted">Assigning FS number and building the document</p>
        </div>
      )}

      {screen === "preview" && fsNumber && reportId && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                FS No.
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
                {fsNumber}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-1.5">
              <StatusBadge
                icon={reportStatusMap.pending_adviser_approval.icon}
                variant={reportStatusMap.pending_adviser_approval.variant}
                label={reportStatusMap.pending_adviser_approval.label}
              />
              <span className="text-sm font-medium text-text-secondary">
                {reportStatusMap.pending_adviser_approval.label}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-warning bg-warning-lightest p-3 text-xs text-text-secondary">
            Your event is locked while this report is pending — no new entries,
            voids, or budget edits until your adviser decides.
          </div>

          <PdfViewer url={`/api/reports/${reportId}/pdf`} />

          {/* Cancel Report — treasurer-only, before the adviser acts */}
          <CancelReportButton reportId={reportId} onCancelled={handleCancelled} />
        </div>
      )}
    </div>
  );
}
