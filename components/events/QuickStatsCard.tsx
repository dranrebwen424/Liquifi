import { cn } from "@/lib/utils";

type QuickStatsCardProps = {
  entryCount: number;
  pendingCount: number;
  voidedCount: number;
  lastActivity: string;
  className?: string;
};

export function QuickStatsCard({
  entryCount,
  pendingCount,
  voidedCount,
  lastActivity,
  className,
}: QuickStatsCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card",
        className,
      )}
    >
      {/* Title */}
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-muted">
        Quick Stats
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-3xl font-bold tabular-nums text-text-primary">
            {entryCount}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Entries
          </p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-warning">
            {pendingCount}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Pending
          </p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-error">
            {voidedCount}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Voided
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="my-5 h-px bg-border" />

      {/* Last activity */}
      <div>
        <p className="text-xs text-text-muted">Last activity</p>
        <p className="mt-0.5 text-sm font-medium text-text-primary">
          {lastActivity}
        </p>
      </div>
    </div>
  );
}
