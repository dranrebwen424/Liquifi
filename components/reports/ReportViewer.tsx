import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";
import { CancelReportButton } from "@/components/reports/CancelReportButton";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { PdfViewer } from "@/components/reports/PdfViewer";

// Persistent report viewer — pure server-rendered view of the latest report
// on file. Survives navigation and logout/login because it has no client
// state: the PDF is streamed by the proxy route, not kept in memory.
// Shown for every report state (pending/approved/rejected/cancelled), so a
// report's PDF is always reachable after generation.

type ReportViewerProps = {
  report: { id: string; fs_document_number: string; status: string };
  isArchived: boolean;
  /** Adviser/admin read-only mode — hides treasurer-only controls (cancel).
      The pending-lock banner is treasurer-voiced, so it goes too. */
  readOnly?: boolean;
};

export function ReportViewer({ report, isArchived, readOnly }: ReportViewerProps) {
  const status = reportStatusMap[report.status] ?? reportStatusMap.pending_adviser_approval;
  const isPending = report.status === "pending_adviser_approval";
  const cancellable = !readOnly && isPending && !isArchived;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            FS No.
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">
            {report.fs_document_number}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge icon={status.icon} variant={status.variant} label={status.label} />
          {/* Printing is released only once the adviser approves the report */}
          {report.status === "approved" && (
            <PrintReportButton pdfUrl={`/api/reports/${report.id}/pdf`} />
          )}
        </div>
      </div>

      {cancellable && (
        <div className="rounded-xl border border-warning bg-warning-lightest p-3 text-xs text-text-secondary">
          Your event is locked while this report is pending — no new entries,
          voids, or budget edits until your adviser decides.
        </div>
      )}

      <PdfViewer url={`/api/reports/${report.id}/pdf`} />

      {cancellable && <CancelReportButton reportId={report.id} />}
    </div>
  );
}
