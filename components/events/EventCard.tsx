import Link from "next/link";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { formatPHP } from "@/lib/format";

type EventCardProps = {
  id: string;
  name: string;
  status: "open" | "archived";
  budgetTotal: number;
  totalSpent: number;
};

/** Compute spent from deducted entries only — voided entries excluded. */
function computeSpent(budgetTotal: number, totalSpent: number) {
  return Math.min(totalSpent, budgetTotal * 2); // ponytail: clamp for display only
}

export function EventCard({ id, name, status, budgetTotal, totalSpent }: EventCardProps) {
  const remaining = budgetTotal - totalSpent;
  const pctUsed = budgetTotal > 0 ? (totalSpent / budgetTotal) * 100 : 0;

  return (
    <Link
      href={`/treasurer/events/${id}`}
      className="block rounded-xl border border-border-strong bg-surface p-6 shadow-card transition-all duration-200 hover:border-border-strong hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-text-primary">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Budget: {formatPHP(budgetTotal)}
          </p>
        </div>
        <EventStatusBadge status={status} />
      </div>

      {/* Budget bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border-light">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pctUsed, 100)}%`,
            backgroundColor:
              pctUsed >= 100
                ? "var(--color-error)"
                : pctUsed >= 70
                  ? "var(--color-warning)"
                  : "var(--color-success)",
          }}
        />
      </div>

      {/* Totals row */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          Spent: <span className="font-medium text-text-primary">{formatPHP(totalSpent)}</span>
        </span>
        <span
          className={
            remaining < 0
              ? "font-medium text-error"
              : "font-medium text-text-primary"
          }
        >
          Remaining: {remaining < 0 ? `-${formatPHP(Math.abs(remaining))}` : formatPHP(remaining)}
        </span>
      </div>
    </Link>
  );
}
