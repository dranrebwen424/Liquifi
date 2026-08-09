import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getLatestReportByEvent } from "@/lib/queries/reports";
import { computeSpendingBreakdown } from "@/lib/spending-breakdown";
import { formatPHP } from "@/lib/format";
import { ReportGenerationFlow } from "@/components/reports/ReportGenerationFlow";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { LockedBanner } from "@/components/events/LockedBanner";

type Props = {
  params: Promise<{ eventId: string }>;
};

const LOCKED_STATUSES = ["pending_adviser_approval", "approved"];

export default async function ReportPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");

  const event = await getEventDashboard(eventId);
  if (!event) notFound();

  // Cross-department guard (belt-and-suspenders on top of RLS)
  if (user.departmentId && event.department_id !== user.departmentId) {
    notFound();
  }

  // Latest report on file — drives the precondition gate (no pending/approved report)
  const latestReport = await getLatestReportByEvent(eventId);
  const isLocked = LOCKED_STATUSES.includes(latestReport?.status ?? "");

  const isArchived = event.status === "archived";
  const breakdown = computeSpendingBreakdown(event.entries);
  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Back link */}
      <Link
        href="/treasurer/reports"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-primary md:text-[28px]">
              {event.name}
            </h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Created {createdDate}
            {event.created_by_name && event.created_by_name !== "Unknown" && (
              <> · by {event.created_by_name}</>
            )}
          </p>
        </div>
      </div>

      {/* Locked / Archived banner */}
      <LockedBanner isLocked={isLocked} isArchived={isArchived} />

      {/* Two-column: Report flow + full Spending Breakdown */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-4">
        {/* Left: generation flow (or locked state) — 3/5 on desktop */}
        <div className="lg:w-3/5">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
            {isArchived && !latestReport ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Lock className="h-8 w-8 text-text-muted" />
                <p className="text-sm font-medium text-text-primary">
                  Event archived
                </p>
                <p className="max-w-sm text-xs text-text-muted">
                  This event is read-only.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Regeneration after cancel/reject is the primary action, so
                    the flow goes on top with the superseded PDF below it.
                    Otherwise: viewer first, flow below. */}
                {!isArchived && !isLocked && latestReport ? (
                  <>
                    <ReportGenerationFlow
                      eventId={eventId}
                      previousReport={latestReport}
                    />
                    <ReportViewer report={latestReport} isArchived={isArchived} />
                  </>
                ) : (
                  <>
                    {/* Persistent viewer — latest report on file (if any). The
                        PDF survives navigation and logout/login: it streams
                        from the proxy route; the page re-fetches it on load. */}
                    {latestReport && (
                      <ReportViewer report={latestReport} isArchived={isArchived} />
                    )}
                    {/* Generation flow — hidden while locked (pending/approved)
                        or archived; shown when no report is on file yet. */}
                    {!isArchived && !isLocked && (
                      <ReportGenerationFlow
                        eventId={eventId}
                        previousReport={latestReport}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: full Spending Breakdown — target of "See more" on the dashboard */}
        <div
          id="spending-breakdown"
          className="scroll-mt-6 lg:w-2/5"
        >
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-base font-semibold text-text-primary">
              Spending Breakdown
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Per-category spend from deducted entries
            </p>

            {breakdown.length === 0 ? (
              <p className="mt-6 rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-xs text-text-muted">
                No deducted expenses yet — breakdown appears once entries are
                deducted.
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {breakdown.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {item.name}
                      </p>
                      <p className="shrink-0 text-sm tabular-nums text-text-primary">
                        {formatPHP(item.amount)}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border-light">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(item.percentage, 1)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-text-muted">
                      {item.percentage}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
