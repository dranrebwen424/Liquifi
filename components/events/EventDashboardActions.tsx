"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight, History, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogEntryModal } from "@/components/entries/LogEntryModal";

type EventDashboardActionsProps = {
  eventId: string;
  canMutate: boolean;
  isArchived: boolean;
  isLocked: boolean;
  /** Adviser/admin read-only mode — omits all mutating controls entirely. */
  readOnly?: boolean;
};

export function EventDashboardActions({
  eventId,
  canMutate,
  isArchived,
  isLocked,
  readOnly,
}: EventDashboardActionsProps) {
  const [logEntryOpen, setLogEntryOpen] = useState(false);

  // Read-only (adviser/admin): mobile action strip omitted entirely.
  if (readOnly) return null;

  return (
    <>
      {/* Mobile: Figma-matched pill buttons */}
      <div className="flex gap-3 lg:hidden">
        {/* Log Entry — dark filled pill */}
        <button
          onClick={() => setLogEntryOpen(true)}
          disabled={!canMutate}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[17px] px-4 py-[10px] text-[14px] font-medium transition-[color,transform,shadow]",
            canMutate
              ? "bg-surface-inverse text-text-inverse hover:bg-accent-hover hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              : "cursor-not-allowed bg-neutral text-text-inverse/50",
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
          Log Entry
        </button>

        {/* View Report — outlined pill */}
        {isArchived ? (
          <button
            type="button"
            disabled
            className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-[17px] border border-border px-4 py-[10px] text-[12px] font-medium text-text-muted"
            title="Archived — no reports."
          >
            <ArrowUpRight className="h-3 w-3" />
            View Report
          </button>
        ) : (
          <Link
            href={`/treasurer/reports/${eventId}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[17px] border border-text-primary px-4 py-[10px] text-[12px] font-medium text-text-primary transition-[color,transform,shadow] hover:bg-surface-secondary hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="View financial report"
          >
            <ArrowUpRight className="h-3 w-3" />
            View Report
          </Link>
        )}
      </div>

      {/* Desktop: unchanged original layout */}
      <div className="hidden grid-cols-2 gap-3 lg:grid">
        {/* Log Entry — always visible; grayed out when locked/archived */}
        <button
          onClick={() => setLogEntryOpen(true)}
          disabled={!canMutate}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-[color,transform,shadow]",
            canMutate
              ? "bg-accent text-accent-foreground hover:bg-accent-hover hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
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
          Log Entry
        </button>

        {/* View Report — always a link; disabled only when archived (no report exists) */}
        {isArchived ? (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-text-inverse/50"
            title="Archived — no reports."
          >
            <ArrowUpRight className="h-4 w-4" />
            View Report
          </button>
        ) : (
          <Link
            href={`/treasurer/reports/${eventId}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-medium text-text-inverse transition-[color,transform,shadow] hover:bg-white/10 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="View financial report"
          >
            <ArrowUpRight className="h-4 w-4" />
            View Report
          </Link>
        )}
      </div>

      {/* Budget History — full-width card below the 2 CTAs (Figma 171:212) */}
      <Link
        href={`/treasurer/events/${eventId}/budget-history`}
        className="mt-3 flex items-center justify-between gap-3 rounded-[5px] bg-surface px-4 py-3.5 transition-[transform,shadow] hover:scale-[1.01] active:scale-[0.99]"
        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <History className="h-4 w-4 shrink-0 text-text-primary" />
          <span className="truncate text-[13px] font-medium text-text-primary">
            Budget History
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
      </Link>

      <LogEntryModal
        open={logEntryOpen}
        onClose={() => setLogEntryOpen(false)}
        eventId={eventId}
      />
    </>
  );
}
