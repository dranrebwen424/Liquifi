import { formatPHP } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { EntryType, EntryStatus } from "@/types";

type EntryRowProps = {
  type: EntryType;
  status: EntryStatus;
  amount: number;
  description?: string | null;
  supplierName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  voidReason?: string | null;
  voidedBy?: string | null;
};

const typeLabel: Record<EntryType, { label: string; class: string }> = {
  receipt: {
    label: "Receipt",
    class: "bg-info-lightest text-info-foreground",
  },
  manual: {
    label: "Manual",
    class: "bg-surface-secondary text-text-secondary",
  },
};

const statusVariant: Record<string, "info" | "warning" | "success" | "error" | "neutral"> = {
  ai_parsed: "info",
  pending_approval: "warning",
  deducted: "success",
  approved: "success",
  rejected: "error",
  voided: "error",
  draft: "info",
  discarded: "error",
};

function formatStatus(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EntryRow({
  type,
  status,
  amount,
  description,
  supplierName,
  documentType,
  documentNumber,
  voidReason,
  voidedBy,
}: EntryRowProps) {
  const isVoided = status === "voided";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-border px-4 py-3 last:border-0",
        isVoided && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {/* Type badge */}
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              typeLabel[type].class,
            )}
          >
            {typeLabel[type].label}
          </span>

          {/* Description / supplier */}
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm font-medium text-text-primary",
                isVoided && "line-through",
              )}
            >
              {description ?? supplierName ?? "Untitled entry"}
            </p>
            {supplierName && description && (
              <p className="truncate text-xs text-text-muted">{supplierName}</p>
            )}
            {documentType && documentNumber && (
              <p className="truncate text-xs text-text-muted">
                {documentType} #{documentNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Amount */}
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              isVoided
                ? "text-text-muted line-through"
                : "text-text-primary",
            )}
          >
            {formatPHP(amount)}
          </span>

          {/* Status badge */}
          <StatusBadge variant={statusVariant[status] ?? "neutral"}>
            {formatStatus(status)}
          </StatusBadge>
        </div>
      </div>

      {/* Void attribution — always visible, not hidden behind hover */}
      {isVoided && voidReason && (
        <p className="text-xs text-text-muted">
          Voided{voidedBy ? ` by ${voidedBy}` : ""}: {voidReason}
        </p>
      )}
    </div>
  );
}
