import Link from "next/link";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { EventStatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  id: string;
  name: string;
  status: "open" | "archived";
  budgetTotal: number;
  totalSpent: number;
  numEntries: number;
  createdAt: string;
  /** Override the default treasurer link (e.g. adviser/admin read-only views). */
  href?: string;
};

function budgetColor(pct: number) {
  if (pct >= 100) return "bg-error";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

export function EventListItem({ id, name, status, budgetTotal, totalSpent, numEntries, createdAt, href }: Props) {
  const created = new Date(createdAt);
  const dateStr = created.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  const pct = budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;

  return (
    <Link
      href={href ?? `/treasurer/events/${id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface px-4 py-3 transition-all duration-200 hover:border-border-strong hover:bg-surface-secondary hover:shadow-md md:px-5"
    >
      {/* Folder icon — standalone, fills solid ink on hover */}
      <Folder className="h-5 w-5 shrink-0 text-text-muted transition-colors group-hover:fill-current group-hover:text-text-primary" />

      {/* Name + Date */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
        <p className="mt-0.5 text-xs text-text-muted">{dateStr}</p>
      </div>

      {/* Amount + Budget (desktop only) */}
      <div className="hidden items-center gap-4 sm:flex sm:gap-6">
        {/* Amount */}
        <div className="w-[120px] text-right">
          <p className="text-sm font-medium tabular-nums text-text-primary">{formatPHP(totalSpent)}</p>
          <p className="text-[11px] text-text-muted">of {formatPHP(budgetTotal)}</p>
        </div>

        {/* Budget progress bar */}
        <div className="hidden w-[80px] md:block">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-light">
            <div
              className={`h-full rounded-full ${budgetColor(pct)}`}
              style={{ width: `${Math.max(pct, 1)}%` }}
            />
          </div>
        </div>

        {/* Entry count */}
        <div className="flex w-[48px] items-center justify-center gap-1 text-xs text-text-muted">
          <FileText className="h-3 w-3" />
          {numEntries}
        </div>

        {/* Status badge */}
        <div className="w-[80px]">
          <EventStatusBadge status={status} />
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
