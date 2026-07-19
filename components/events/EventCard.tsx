import Link from "next/link";
import { Folder, FileText } from "lucide-react";
import { formatPHP } from "@/lib/format";

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
      className="flex min-h-[160px] w-full flex-col rounded-xl border border-border-strong bg-surface p-4 transition-all duration-200 hover:border-accent hover:shadow-lg hover:scale-[1.02] md:mx-auto md:h-[200px] md:max-w-[280px] md:p-5"
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isOpen ? "bg-success-light text-success" : "bg-accent-light text-accent"
          }`}
        >
          <Folder className="h-4 w-4" />
        </div>
        <h3 className="min-w-0 text-base font-semibold leading-6 text-text-primary line-clamp-2">
          {name}
        </h3>
      </div>
      <p
        className={`mt-1.5 text-xs font-medium uppercase tracking-wide ${
          isOpen ? "text-success" : "text-text-muted"
        }`}
      >
        {isOpen ? "Open" : "Archived"}
      </p>

      {/* Budget progress bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-light">
          <div className={`h-full rounded-full ${budgetColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-text-muted">
          {formatPHP(totalSpent)} of {formatPHP(budgetTotal)}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] leading-4 text-text-muted">
        <span className="truncate">By: {createdByName}</span>
        <span className="flex shrink-0 items-center gap-1">
          <FileText className="h-3 w-3" />
          {numEntries}
        </span>
      </div>
    </Link>
  );
}
