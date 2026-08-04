import { FileText, Pencil, CircleMinus } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { StatusBadge, entryStatusMap } from "@/components/ui/StatusBadge";
import { entryTitle } from "@/components/entries/entry-title";
import { cn } from "@/lib/utils";
import type { EntryType, EntryStatus } from "@/types";

type EntryRowProps = {
  type: EntryType;
  status: EntryStatus;
  amount: number;
  description?: string | null;
  supplierName?: string | null;
  category?: string | null;
  formPayload?: unknown;
  itemBreakdown?: unknown;
  createdAt?: string;
  voidedAt?: string | null;
  voidedByName?: string | null;
  onClick?: () => void;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function EntryRow({
  type,
  status,
  amount,
  description,
  supplierName,
  category,
  formPayload,
  itemBreakdown,
  createdAt,
  voidedAt,
  voidedByName,
  onClick,
}: EntryRowProps) {
  const isVoided = status === "voided";
  const displayName = entryTitle({ supplierName, description, category, formPayload, itemBreakdown });
  const dateStr = formatDate(createdAt);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-start justify-between px-4 py-3 transition-colors hover:bg-surface-secondary/50",
        "md:items-center md:justify-start md:gap-4 md:grid md:[grid-template-columns:minmax(0,2.5fr)_1fr_1fr_0.8fr_7rem]",
        isVoided && "opacity-60",
      )}
    >
      {/* Left — icon + text block */}
      <div className="flex min-w-0 items-start gap-3 md:items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          {type === "receipt" ? (
            <FileText className="h-4 w-4 text-text-muted" />
          ) : (
            <Pencil className="h-4 w-4 text-text-muted" />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-semibold text-text-primary",
              isVoided && "line-through",
            )}
          >
            {displayName}
          </p>
          {/* Voided: who/when; otherwise mobile category + date */}
          {isVoided ? (
            <p className="truncate text-xs text-text-muted">
              {[voidedByName ? `Voided by ${voidedByName}` : "Voided", formatDate(voidedAt)]
                .filter(Boolean)
                .join(" \u00B7 ")}
            </p>
          ) : (
            <p className="truncate text-xs text-text-muted md:hidden">
              {[category, dateStr].filter(Boolean).join(" \u00B7 ") || "\u00A0"}
            </p>
          )}
        </div>
      </div>

      {/* Desktop: Date column (hidden mobile) */}
      <p className="hidden truncate text-xs text-text-muted md:block">
        {dateStr}
      </p>

      {/* Desktop: Category column (hidden mobile) */}
      <p className="hidden truncate text-xs text-text-muted md:block">
        {category || "\u00A0"}
      </p>

      {/* Amount + Status — flex-col on mobile, md:contents on desktop */}
      <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:gap-4 md:contents">
        <p
          className={cn(
            "text-right text-sm font-semibold tabular-nums",
            isVoided ? "text-text-muted line-through" : "text-text-primary",
          )}
        >
          {formatPHP(amount)}
        </p>
        <StatusBadge
          icon={entryStatusMap[status]?.icon ?? CircleMinus}
          variant={entryStatusMap[status]?.variant ?? "neutral"}
          label={entryStatusMap[status]?.label ?? status}
        />
      </div>
    </div>
  );
}
