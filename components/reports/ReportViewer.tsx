import { CancelReportButton } from "@/components/reports/CancelReportButton";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { ReportFileCard } from "@/components/reports/ReportFileCard";

// Persistent report viewer — pure server-rendered view of the latest report
// on file. Survives navigation and logout/login because it has no client
// state: the PDF is streamed by the proxy route on demand (View/Download),
// never kept in memory. Shown for every report state
// (pending/approved/rejected/cancelled), so a report is always reachable.

type ReportViewerProps = {
  report: { id: string; fs_document_number: string; status: string };
  isArchived: boolean;
  /** Adviser/admin read-only mode — hides treasurer-only controls (cancel).
      The pending-lock banner is treasurer-voiced, so it goes too. */
  readOnly?: boolean;
};

export function ReportViewer({ report, isArchived, readOnly }: ReportViewerProps) {
  const isPending = report.status === "pending_adviser_approval";
  const cancellable = !readOnly && isPending && !isArchived;

  const isApproved = report.status === "approved";

  return (
    <div className="flex flex-col gap-4">
      {/* The report as a file: name, status, View + Download */}
      <ReportFileCard report={report} />

      {isApproved && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Printing is released only once the adviser approves the report */}
          <PrintReportButton pdfUrl={`/api/reports/${report.id}/pdf`} />
        </div>
      )}

      {cancellable && (
        <>
          <div className="rounded-xl border border-warning bg-warning-lightest p-3 text-xs text-text-secondary">
            Your event is locked while this report is pending — no new entries,
            voids, or budget edits until your adviser decides.
          </div>
          <CancelReportButton reportId={report.id} />
        </>
      )}
    </div>
  );
}
