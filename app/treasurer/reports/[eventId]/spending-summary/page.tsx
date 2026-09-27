import { notFound } from "next/navigation";
import { ReportDetailHeader } from "@/components/reports/ReportDetailHeader";
import { requireRole } from "@/lib/auth-guard";
import { formatPHP } from "@/lib/format";
import { getEventDashboard } from "@/lib/queries/events";
import { computeSpendingBreakdown } from "@/lib/spending-breakdown";

type Props = { params: Promise<{ eventId: string }> };

export default async function ReportSpendingSummaryPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");
  const event = await getEventDashboard(eventId);
  if (!event || !user.departmentId || event.department_id !== user.departmentId) notFound();
  const breakdown = computeSpendingBreakdown(event.entries);
  const remaining = event.budget_total - event.total_spent;

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <ReportDetailHeader eventId={eventId} title="Spending Summary" />
      <section aria-labelledby="totals-title">
        <h2 id="totals-title" className="mb-3 text-xs font-medium text-text-secondary">Event totals</h2>
        <dl className="flex flex-col gap-2.5">
          {[
            { label: "Total budget", amount: event.budget_total },
            { label: "Total spent", amount: event.total_spent },
            { label: "Remaining", amount: remaining },
          ].map(({ label, amount }) => (
            <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-sm bg-surface px-4 py-4 shadow-card">
              <dt className="text-xs text-text-secondary">{label}</dt>
              <dd className={`break-all text-base font-semibold tabular-nums ${amount < 0 ? "text-error" : "text-text-primary"}`}>
                {amount < 0 ? `-${formatPHP(Math.abs(amount))}` : formatPHP(amount)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-8" aria-labelledby="categories-title">
        <h2 id="categories-title" className="mb-3 text-xs font-medium text-text-secondary">Spending by category</h2>
        {breakdown.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">No deducted expenses yet.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {breakdown.map((item) => (
              <li key={item.name} className="rounded-sm bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="break-words text-sm font-medium capitalize text-text-primary">{item.name.replace(/_/g, " ")}</h3>
                  <p className="break-all text-sm font-semibold tabular-nums text-text-primary">{formatPHP(item.amount)}</p>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">{item.percentage}% of total spent</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border-light" aria-hidden>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(item.percentage, 1)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
