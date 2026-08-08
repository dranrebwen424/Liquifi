"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogEntryModal } from "@/components/entries/LogEntryModal";

type EventDashboardActionsProps = {
  eventId: string;
  canMutate: boolean;
  isArchived: boolean;
  isLocked: boolean;
};

export function EventDashboardActions({
  eventId,
  canMutate,
  isArchived,
  isLocked,
}: EventDashboardActionsProps) {
  const [logEntryOpen, setLogEntryOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <button
          onClick={() => setLogEntryOpen(true)}
          disabled={!canMutate}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-[color,transform,shadow] hover:scale-[1.02]",
            canMutate
              ? "bg-accent text-accent-foreground hover:bg-accent-hover hover:shadow-md active:scale-[0.98]"
              : "cursor-not-allowed border border-border bg-surface text-text-muted opacity-50",
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

        {canMutate ? (
          <Link
            href={`/treasurer/reports/${eventId}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-[color,transform,shadow] hover:bg-surface-secondary hover:border-border-strong hover:shadow-sm active:scale-[0.98]"
            title="Generate financial report"
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-muted opacity-50"
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

      <LogEntryModal
        open={logEntryOpen}
        onClose={() => setLogEntryOpen(false)}
        eventId={eventId}
      />
    </>
  );
}
