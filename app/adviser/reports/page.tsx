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
    .sort((a, b) =>
      (b.report?.generated_at ?? "").localeCompare(a.report?.generated_at ?? ""),
    );

  const isArchived = (r: (typeof rows)[number]) => r.event.status === "archived";
  const active = rows.filter((r) => !isArchived(r));

  // Reviewer-scoped life-cycle groups: what's awaiting them, what they've
  // decided, and the terminal archived reports.
  const pending = active.filter(
    (r) => r.report!.status === "pending_adviser_approval",
  );
  const reviewed = active.filter(
    (r) => r.report!.status === "approved" || r.report!.status === "rejected",
  );
  const archived = rows.filter((r) => isArchived(r));

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
        <>
          {/* ── Pending approval: awaiting your review ── */}
          {pending.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Pending approval
              </h2>
              {pending.map(({ event, report, statusEntry }) => (
                <Link
                  key={event.id}
                  href={`/adviser/reports/${event.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)}{" "}
                      spent{report && <> · {report.fs_document_number}</>}
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

          {/* ── Reviewed: your decision trail (approved / rejected) ── */}
          {reviewed.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Reviewed
              </h2>
              {reviewed.map(({ event, report, statusEntry }) => (
                <Link
                  key={event.id}
                  href={`/adviser/reports/${event.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)}{" "}
                      spent{report && <> · {report.fs_document_number}</>}
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
                  href={`/adviser/reports/${event.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {event.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatPHP(event.total_spent)} of {formatPHP(event.budget_total)}{" "}
                      spent{report && <> · {report.fs_document_number}</>}
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
