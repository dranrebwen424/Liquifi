import Link from "next/link";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";
import { getLatestReportsByEvent } from "@/lib/queries/reports";
import { formatPHP } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdviserReportsPage() {
  const user = await requireRole("adviser");
  const departmentId = user.departmentId;
  if (!departmentId) {
    throw new Error("Adviser account is missing a department");
  }

  const events = await getDepartmentEvents(departmentId);
  const reportMap = await getLatestReportsByEvent(events.map((e) => e.id));

  const rows = events
    .map((event) => {
      const report = reportMap.get(event.id) ?? null;
      const statusEntry = report
        ? (reportStatusMap[report.status] ?? null)
        : null;
      return { event, report, statusEntry };
    })
    // Events without a report are irrelevant to the adviser — nothing to review.
    .filter((r) => r.report)
    // Newest report first — ordered by when the report was generated.
    .sort((a, b) =>
      (b.report?.generated_at ?? "").localeCompare(a.report?.generated_at ?? ""),
    );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
          Reports
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Review and approve liquidation reports from your department&apos;s
          treasurer
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-text-muted" />}
          title="No reports yet"
          description="Generated reports will appear here for your review."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ event, report, statusEntry }) => (
            <li key={event.id}>
              <Link
                href={`/adviser/reports/${event.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {event.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)}{" "}
                    spent
                    {report && <> · {report.fs_document_number}</>}
                  </p>
                </div>
                {statusEntry && (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge
                      icon={statusEntry.icon}
                      variant={statusEntry.variant}
                      label={statusEntry.label}
                    />
                    <span className="hidden text-xs font-medium text-text-secondary sm:inline">
                      {statusEntry.label}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
