import { Download, Eye, FileText } from "lucide-react";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";

// Replaces the inline full-PDF renderer with a compact "file" card — the
// report is a downloadable document, not an embedded canvas. View opens the
// streamed PDF (via the session-authed proxy) in a fresh tab; Download saves
// it as an attachment. Renders for every report state so the PDF stays
// reachable after generation, regardless of where the review landed.

type ReportFileCardProps = {
  report: { id: string; fs_document_number: string; status: string };
};

export function ReportFileCard({ report }: ReportFileCardProps) {
  const status = reportStatusMap[report.status] ?? reportStatusMap.pending_adviser_approval;
  const viewUrl = `/api/reports/${report.id}/pdf`;
  const downloadUrl = `${viewUrl}?dl=1`;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-strong bg-surface p-4 shadow-card transition-shadow hover:shadow-md sm:flex-nowrap sm:p-5">
      {/* File type tile */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-light">
        <FileText className="h-6 w-6 text-accent" />
      </div>

      {/* Report identity */}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold tabular-nums text-text-primary">
          <span className="truncate">{report.fs_document_number}</span>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary"
            title={status.label}
          >
            <StatusBadge
              icon={status.icon}
              variant={status.variant}
              label={status.label}
            />
            {status.label}
          </span>
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Liquidation financial statement report
        </p>
      </div>

      {/* Actions */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover sm:flex-none"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </a>
        <a
          href={downloadUrl}
          download
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border-strong px-4 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-secondary sm:flex-none"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}
