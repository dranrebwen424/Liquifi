import { ChevronRight, Download } from "lucide-react";
import { ReportDetailHeader } from "@/components/reports/ReportDetailHeader";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";
import type { getAllReportsByEvent } from "@/lib/queries/reports";

type Props = {
  reports: Awaited<ReturnType<typeof getAllReportsByEvent>>;
  eventId: string;
  role?: "treasurer" | "adviser";
  /** Overrides the derived back target — see ReportDetailHeader. */
  backHref?: string;
};

export function ReportPreviousRevisions({ reports, eventId, role = "treasurer", backHref }: Props) {
  const byMonth = new Map<string, typeof reports>();
  for (const report of reports) {
    const month = new Date(report.generated_at).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    const group = byMonth.get(month);
    if (group) group.push(report);
    else byMonth.set(month, [report]);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <ReportDetailHeader role={role} eventId={eventId} title="Previous Revisions" backHref={backHref} />
      {reports.length === 0 ? (
        <p className="mt-16 text-center text-sm text-text-muted">No previous revisions yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {[...byMonth].map(([month, list]) => (
            <section key={month} aria-label={month}>
              <h2 className="mb-3 text-xs font-medium text-text-secondary">{month}</h2>
              <ul className="flex flex-col gap-2.5">
                {list.map((report) => {
                  const status = reportStatusMap[report.status];
                  const date = new Date(report.generated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
                  return (
                    <li key={report.id} className="rounded-sm bg-surface shadow-card">
                      <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noopener noreferrer"
                        aria-label={`View revision ${report.revision_count + 1}, ${report.fs_document_number}`}
                        className="flex items-center justify-between gap-3 rounded-sm px-4 pt-4 pb-3 transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold tabular-nums text-text-primary">{report.fs_document_number}</p>
                          <p className="mt-1 text-[11px] text-text-muted">Revision {report.revision_count + 1} &middot; Generated {date}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                      </a>
                      <div className="flex items-center justify-between gap-3 border-t border-border-light px-4 py-1">
                        <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
                          <StatusBadge {...status} /> {status.label}
                        </span>
                        <a href={`/api/reports/${report.id}/pdf?dl=1`} download title="Download revision"
                          aria-label={`Download revision ${report.revision_count + 1}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent">
                          <Download className="h-4 w-4" aria-hidden />
                        </a>
                      </div>
                      {report.rejection_reason && <p className="whitespace-pre-wrap break-words px-4 pb-4 text-xs leading-5 text-text-secondary">{report.rejection_reason}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
