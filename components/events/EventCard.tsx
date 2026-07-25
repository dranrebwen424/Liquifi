import Link from "next/link";
import { Folder, FileText } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { EventStatusBadge } from "@/components/ui/StatusBadge";

type EventCardProps = {
  id: string;
  name: string;
  status: "open" | "archived";
  budgetTotal: number;
  totalSpent: number;
  numEntries: number;
  createdByName: string;
};

function budgetColor(pct: number) {
  if (pct >= 100) return "bg-error";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

export function EventCard({ id, name, status, budgetTotal, totalSpent, numEntries, createdByName }: EventCardProps) {
  const isOpen = status === "open";
  const pct = budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;

  return (
    <Link
      href={`/treasurer/events/${id}`}
      className="group flex min-h-[160px] w-full flex-col rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-accent hover:shadow-lg hover:scale-[1.02] md:mx-auto md:max-w-[300px]"
    >
      {/* Icon + Name */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isOpen ? "bg-success-light text-success" : "bg-neutral-light text-text-muted"
          }`}
        >
          <Folder className="h-5 w-5" />
        </div>
        <h3 className="min-w-0 pt-0.5 text-base font-semibold leading-snug text-text-primary line-clamp-2">
          {name}
        </h3>
      </div>

      {/* Status */}
      <div className="mt-2.5">
        <EventStatusBadge status={status} />
      </div>

      {/* Budget bar */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] text-text-muted">
            {formatPHP(totalSpent)} of {formatPHP(budgetTotal)}
          </p>
          {pct > 0 && (
            <span className="text-[11px] font-medium text-text-muted">{Math.round(pct)}%</span>
          )}
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border-light">
          <div
            className={`h-full rounded-full transition-all ${budgetColor(pct)}`}
            style={{ width: `${Math.max(pct, 1)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-text-muted">
        <span className="truncate">{createdByName}</span>
        <span className="flex shrink-0 items-center gap-1">
          <FileText className="h-3 w-3" />
          {numEntries} {numEntries === 1 ? "entry" : "entries"}
        </span>
      </div>
    </Link>
  );
}
