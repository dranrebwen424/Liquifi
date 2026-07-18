import { formatPHP } from "@/lib/format";

type BudgetSummaryProps = {
  budgetTotal: number;
  totalSpent: number;
};

export function BudgetSummary({ budgetTotal, totalSpent }: BudgetSummaryProps) {
  const remaining = budgetTotal - totalSpent;
  const pctUsed = budgetTotal > 0 ? (totalSpent / budgetTotal) * 100 : 0;

  const barColor =
    pctUsed >= 100
      ? "var(--color-error)"
      : pctUsed >= 70
        ? "var(--color-warning)"
        : "var(--color-success)";

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="grid grid-cols-3 gap-6">
        {/* Total */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Total
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-9 text-text-primary">
            {formatPHP(budgetTotal)}
          </p>
        </div>

        {/* Spent */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Spent
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-9 text-text-primary">
            {formatPHP(totalSpent)}
          </p>
        </div>

        {/* Remaining */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Remaining
          </p>
          <p
            className={`mt-1 text-[28px] font-semibold leading-9 ${
              remaining < 0 ? "text-error" : "text-text-primary"
            }`}
          >
            {remaining < 0
              ? `-${formatPHP(Math.abs(remaining))}`
              : formatPHP(remaining)}
          </p>
        </div>
      </div>

      {/* Budget bar */}
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-border-light">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pctUsed, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-text-muted">
        {pctUsed >= 100
          ? "Over budget"
          : pctUsed >= 70
            ? "Near budget limit"
            : `${Math.round(pctUsed)}% of budget used`}
      </p>
    </div>
  );
}
