"use client";

import { useState } from "react";
import Link from "next/link";
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
  /** Adviser/admin read-only mode — omits all mutating controls entirely. */
  readOnly?: boolean;
  /** Mobile-only Figma layout — shows budget info with creator details. */
  mobileOnly?: boolean;
  /** Creator name (shown in mobile layout). */
  createdByName?: string | null;
  /** Formatted created date (shown in mobile layout). */
  createdDate?: string;
  className?: string;
};

export function BudgetSummary({
  budgetTotal,
  totalSpent,
  eventId,
  canMutate,
  isArchived,
  isLocked,
  readOnly,
  mobileOnly,
  createdByName,
  createdDate,
  className,
}: BudgetSummaryProps) {
  const [logEntryOpen, setLogEntryOpen] = useState(false);
  const remaining = budgetTotal - totalSpent;
  const pctUsed = budgetTotal > 0 ? (totalSpent / budgetTotal) * 100 : 0;

  // Step 18: no text label at/over budget — negative red number is the signal
  // (user decision). Empty string keeps the layout row for a stable height.
  const statusText =
    pctUsed >= 100
      ? ""
      : pctUsed >= 70
        ? "Near Budget Limit"
        : `${Math.round(pctUsed)}% Budget Utilized`;

  // ── Mobile-only Figma layout ──
  if (mobileOnly) {
    return (
      <>
        <div className={cn("rounded-[20px] bg-surface-inverse p-5 shadow-card", className)}>
          {/* BUDGET label */}
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse/60">
            BUDGET
          </p>

          {/* Main budget amount */}
          <p
            className={cn(
              "mt-1 text-[26px] font-bold leading-tight tabular-nums",
              remaining < 0 ? "text-error" : "text-text-inverse",
            )}
          >
            {remaining < 0
              ? `-${formatPHP(Math.abs(remaining))}`
              : formatPHP(remaining)}
          </p>

          {/* Total + Spent row */}
          <div className="mt-3.5 flex gap-7">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse/60">
                TOTAL
              </p>
              <p className="mt-0.5 text-[14px] font-bold tabular-nums text-text-inverse">
                {formatPHP(budgetTotal)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse/60">
                SPEND
              </p>
              <p className="mt-0.5 text-[14px] font-bold tabular-nums text-text-inverse">
                {formatPHP(totalSpent)}
              </p>
            </div>
          </div>

          {/* Progress bar + percentage */}
          <div className="mt-3.5 flex items-center gap-3">
            <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/10">
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
            <span className="shrink-0 text-[11px] text-text-inverse/60">
              {Math.round(pctUsed)}%
            </span>
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

  // ── Desktop layout (unchanged) ──
  return (
    <>
      <div className={cn("rounded-xl bg-surface-inverse p-4 shadow-card sm:p-6", className)}>
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Expense data */}
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-inverse/60">
              BUDGET
            </p>
            <p
              className={`mt-1 text-[26px] font-semibold leading-8 tabular-nums sm:text-[40px] sm:leading-12 ${
                remaining < 0 ? "text-error" : "text-text-inverse"
              }`}
            >
              {remaining < 0
                ? `-${formatPHP(Math.abs(remaining))}`
                : formatPHP(remaining)}
            </p>

            {/* Total + Paid */}
            <div className="mt-3 flex gap-6 sm:mt-4 sm:gap-8">
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

          {/* Right: Action buttons (desktop only) — omitted entirely in read-only mode */}
          {!readOnly && (
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

            {canMutate ? (
              <Link
                href={`/treasurer/reports/${eventId}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-text-inverse transition-[color,transform,shadow] hover:bg-white/10 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                title="Generate financial report"
              >
                <FileText className="h-4 w-4" />
                Generate Report
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-text-inverse/50"
                title={
                  isArchived
                    ? "Archived — no reports."
                    : "Report already pending."
                }
              >
                <FileText className="h-4 w-4" />
                Generate Report
              </button>
            )}
            </div>
          )}
        </div>

        {/* Full-width progress bar + status text */}
        <div className="mt-4 sm:mt-6">
          <p className="mb-1.5 text-right text-xs text-text-inverse/60">
            {statusText}
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
