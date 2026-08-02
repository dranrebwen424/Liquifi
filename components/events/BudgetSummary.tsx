"use client";

import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LogEntryModal } from "@/components/entries/LogEntryModal";

type BudgetSummaryProps = {
  budgetTotal: number;
  totalSpent: number;
  eventId: string;
  canMutate: boolean;
  isArchived: boolean;
  isLocked: boolean;
  className?: string;
};

export function BudgetSummary({
  budgetTotal,
  totalSpent,
  eventId,
  canMutate,
  isArchived,
  isLocked,
  className,
}: BudgetSummaryProps) {
  const [logEntryOpen, setLogEntryOpen] = useState(false);
  const remaining = budgetTotal - totalSpent;
  const pctUsed = budgetTotal > 0 ? (totalSpent / budgetTotal) * 100 : 0;

  const statusText =
    pctUsed >= 100
      ? "Over Budget"
      : pctUsed >= 70
        ? "Near Budget Limit"
        : `${Math.round(pctUsed)}% Budget Utilized`;

  const isFullyUtilized = pctUsed >= 100;

  return (
    <>
      <div className={cn("rounded-xl bg-surface-inverse p-5 shadow-card sm:p-6", className)}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Expense data */}
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-inverse/60">
              Expenses
            </p>
            <p
              className={`mt-1 text-[32px] font-semibold leading-10 tabular-nums sm:text-[40px] sm:leading-12 ${
                remaining < 0 ? "text-error" : "text-text-inverse"
              }`}
            >
              {remaining < 0
                ? `-${formatPHP(Math.abs(remaining))}`
                : formatPHP(remaining)}
            </p>

            {/* Total + Paid */}
            <div className="mt-4 flex gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-inverse/60">
                  Total
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-inverse">
                  {formatPHP(budgetTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-inverse/60">
                  Paid
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-inverse">
                  {formatPHP(totalSpent)}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Action buttons (desktop only) */}
          <div className="hidden flex-col gap-2 lg:flex">
            <button
              onClick={() => setLogEntryOpen(true)}
              disabled={!canMutate}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-[color,transform,shadow] hover:scale-[1.02]",
                canMutate
                  ? "bg-surface text-text-primary hover:bg-surface-secondary hover:shadow-md active:scale-[0.98]"
                  : "cursor-not-allowed bg-white/10 text-text-inverse/50",
              )}
              title={
                isArchived
                  ? "Archived — read-only."
                  : isLocked
                    ? "Locked — report pending."
                    : "Log a new expense"
              }
            >
              <Plus className="h-4 w-4" />
              New Entry
            </button>

            <button
              disabled={!canMutate}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-[color,transform,shadow] hover:scale-[1.02]",
                canMutate
                  ? "border-white/30 text-text-inverse hover:bg-white/10 hover:shadow-sm active:scale-[0.98]"
                  : "cursor-not-allowed border-white/10 text-text-inverse/50",
              )}
              title={
                isArchived
                  ? "Archived — no reports."
                  : isLocked
                    ? "Report already pending."
                    : "Generate financial report"
              }
            >
              <FileText className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Full-width progress bar + status text */}
        <div className="mt-6">
          <p className="mb-1.5 text-right text-xs text-text-inverse/60">
            {isFullyUtilized ? "Budget Fully Utilized" : statusText}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
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
        </div>
      </div>

      <LogEntryModal
        open={logEntryOpen}
        onClose={() => setLogEntryOpen(false)}
        eventId={eventId}
      />
    </>
  );
}
