import Link from "next/link";
import { ArrowRight, ChartPie } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

type Category = {
  name: string;
  amount: number;
  percentage: number;
};

type SpendingBreakdownCardProps = {
  categories: Category[];
  eventId: string;
  /** Adviser/admin read-only mode — hides the treasurer-only "See more" link. */
  readOnly?: boolean;
  className?: string;
};

export function SpendingBreakdownCard({
  categories,
  eventId,
  readOnly,
  className,
}: SpendingBreakdownCardProps) {
  // ponytail: top 4 only
  const topCategories = categories.slice(0, 4);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card",
        className,
      )}
    >
      {/* Title */}
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-muted">
        Spending Breakdown
      </p>

      {/* Category rows */}
      <div className="flex flex-1 flex-col gap-3">
        {topCategories.length === 0 ? (
          <EmptyState
            icon={<ChartPie />}
            title="No spending yet"
            description="Breakdown appears once entries are deducted."
            className="flex-1 py-6"
          />
        ) : (
          topCategories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3">
              {/* Category name */}
              <span className="w-28 shrink-0 truncate text-sm font-medium text-text-primary">
                {cat.name}
              </span>

              {/* Bar track */}
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-light">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>

              {/* Percentage */}
              <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-text-muted">
                {cat.percentage}%
              </span>
            </div>
          ))
        )}
      </div>

      {/* See more link — only when there is data, and never in read-only mode
          (it links to the treasurer report page, which non-treasurers can't open) */}
      {!readOnly && topCategories.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-light">
          <Link
            href={`/treasurer/reports/${eventId}#spending-breakdown`}
            className="group inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text-primary hover:underline underline-offset-2"
          >
            See more
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
