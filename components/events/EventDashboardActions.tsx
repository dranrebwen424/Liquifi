"use client";

import { useState } from "react";
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
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setLogEntryOpen(true)}
          disabled={!canMutate}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-[color,transform]",
            canMutate
              ? "bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.98]"
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

        <button
          disabled={!canMutate}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-[color,transform]",
            canMutate
              ? "border-border text-text-primary hover:bg-surface-secondary hover:border-border-strong active:scale-[0.98]"
              : "cursor-not-allowed border-border bg-surface text-text-muted opacity-50",
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

      <LogEntryModal
        open={logEntryOpen}
        onClose={() => setLogEntryOpen(false)}
        eventId={eventId}
      />
    </>
  );
}
