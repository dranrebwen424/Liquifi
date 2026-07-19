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
};

export function EventListItem({ id, name, status, budgetTotal, totalSpent, numEntries, createdAt }: Props) {
  const created = new Date(createdAt);
  const dateStr = created.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  return (
    <Link
      href={`/treasurer/events/${id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-secondary"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent">
        <Folder className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
          <span>{dateStr}</span>
          <span className="text-text-muted">·</span>
          <span className="tabular-nums">{formatPHP(totalSpent)}</span>
          <span className="flex items-center gap-0.5">
            <FileText className="h-3 w-3" />
            {numEntries}
          </span>
        </div>
      </div>
      <div className="hidden items-center gap-6 sm:flex">
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums text-text-primary">{formatPHP(totalSpent)}</p>
          <p className="text-[11px] text-text-muted">of {formatPHP(budgetTotal)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <FileText className="h-3 w-3" />
          {numEntries}
        </div>
        <EventStatusBadge status={status} />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
    </Link>
  );
}
