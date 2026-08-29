import Link from "next/link";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";
import { getLatestReportsByEvent } from "@/lib/queries/reports";
import { formatPHP } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireRole("treasurer");
  const departmentId = user.departmentId;
  if (!departmentId) {
    throw new Error("Treasurer account is missing a department");
  }

  const events = await getDepartmentEvents(departmentId);
  const reportMap = await getLatestReportsByEvent(events.map((e) => e.id));

  const rows = events.map((event) => {
    const report = reportMap.get(event.id) ?? null;
    const statusEntry = report
      ? (reportStatusMap[report.status] ?? null)
      : null;
    return { event, report, statusEntry };
  });

  const isArchived = (r: (typeof rows)[number]) => r.event.status === "archived";
  const active = rows.filter((r) => !isArchived(r));

  // Report-lifecycle groups (the page is the audit trail / approval record).
  // `cancelled` collapses into the "needs a report" set via the query helper.
  const needsAttention = active
    .filter((r) => !r.report || r.report.status === "rejected")
    .sort((a, b) => {
      const aDate = a.report?.generated_at ?? a.event.created_at;
      const bDate = b.report?.generated_at ?? b.event.created_at;
      return bDate.localeCompare(aDate);
    });
  const pending = active
    .filter((r) => r.report && r.report.status === "pending_adviser_approval")
    .sort((a, b) =>
      (b.report?.generated_at ?? "").localeCompare(a.report?.generated_at ?? ""),
    );
  const onFile = active
    .filter((r) => r.report && r.report.status === "approved")
    .sort((a, b) =>
      (b.report?.generated_at ?? "").localeCompare(a.report?.generated_at ?? ""),
    );
  const archived = rows
    .filter((r) => isArchived(r))
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
          Generate and track financial reports for your events
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-text-muted" />}
          title="No events yet"
          description="Create an event first — reports are generated per event."
        />
      ) : (
        <>
          {/* ── Needs attention: no report yet, or rejected ── */}
          {needsAttention.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Needs attention
              </h2>
              {needsAttention.map(({ event, report, statusEntry }) => (
                <Link
                  key={event.id}
                  href={`/treasurer/reports/${event.id}`}
                  className={
                    report
                      ? "flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent"
                      : "flex items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent"
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)} spent
                      {report && (
                        <> · {report.fs_document_number}</>
                      )}
                    </p>
                  </div>
                  {report && statusEntry ? (
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
                  ) : (
                    <span className="shrink-0 rounded-full border border-border bg-surface-secondary px-3 py-1 text-xs font-medium text-text-secondary">
                      No report yet
                    </span>
                  )}
                </Link>
              ))}
            </section>
          )}

          {/* ── Pending approval ── */}
          {pending.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Pending approval
              </h2>
              {pending.map(({ event, report, statusEntry }) => (
                <Link
                  key={event.id}
                  href={`/treasurer/reports/${event.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)} spent
                      {report && (
                        <> · {report.fs_document_number}</>
                      )}
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
              ))}
            </section>
          )}

          {/* ── On file: approved, event still open ── */}
          {onFile.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                On file
              </h2>
              {onFile.map(({ event, report, statusEntry }) => (
                <Link
                  key={event.id}
                  href={`/treasurer/reports/${event.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)} spent
                      {report && (
                        <> · {report.fs_document_number}</>
                      )}
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
              ))}
            </section>
          )}

          {/* ── Archived: terminal, signed report on file forever ── */}
          {archived.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Archived
              </h2>
              {archived.map(({ event, report, statusEntry }) => (
                <Link
                  key={event.id}
                  href={`/treasurer/reports/${event.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)} spent
                      {report && (
                        <> · {report.fs_document_number}</>
                      )}
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
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
