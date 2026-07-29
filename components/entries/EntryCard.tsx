import { FileText, Pencil } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { EntryType, EntryStatus } from "@/types";

type EntryCardProps = {
  type: EntryType;
  status: EntryStatus;
  amount: number;
  description?: string | null;
  supplierName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  category?: string | null;
  issueDate?: string | null;
  issueTime?: string | null;
  imageUrl?: string | null;
  itemBreakdown?: unknown;
  createdAt?: string;
  voidReason?: string | null;
  voidedBy?: string | null;
  voidedAt?: string | null;
  onClick?: () => void;
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

/** Styled receipt placeholder — simulates a receipt look without real images. */
function ReceiptPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col bg-surface p-3">
      {/* Header lines */}
      <div className="mb-2 flex flex-col items-center gap-1">
        <div className="h-1.5 w-16 rounded-full bg-border" />
        <div className="h-1 w-10 rounded-full bg-border-light" />
      </div>
      {/* Dashed separator */}
      <div className="mb-2 border-b border-dashed border-border" />
      {/* Line items */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <div className="h-1 w-14 rounded-full bg-border-light" />
          <div className="h-1 w-6 rounded-full bg-border-light" />
        </div>
        <div className="flex justify-between">
          <div className="h-1 w-10 rounded-full bg-border-light" />
          <div className="h-1 w-5 rounded-full bg-border-light" />
        </div>
        <div className="flex justify-between">
          <div className="h-1 w-12 rounded-full bg-border-light" />
          <div className="h-1 w-7 rounded-full bg-border-light" />
        </div>
      </div>
      {/* Total */}
      <div className="mt-auto border-t border-dashed border-border pt-1.5">
        <div className="flex justify-between">
          <div className="h-1.5 w-8 rounded-full bg-border" />
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}

/** Manual entry icon placeholder. */
function ManualPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-secondary">
      <Pencil className="h-10 w-10 text-text-muted/50" />
    </div>
  );
}

export function EntryCard({
  type,
  status,
  amount,
  description,
  supplierName,
  voidReason,
  voidedBy,
  onClick,
}: EntryCardProps) {
  const isVoided = status === "voided";
  const displayName = supplierName || description || "Untitled entry";
  const category = supplierName ? description : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all duration-200 hover:border-accent hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        isVoided && "opacity-60",
      )}
    >
      {/* Preview area — receipt image or manual icon */}
      <div className="relative h-32 w-full">
        {type === "receipt" ? (
          <ReceiptPlaceholder />
        ) : (
          <ManualPlaceholder />
        )}

        {/* Status badge — overlaid top right */}
        <div className="absolute right-2 top-2">
          <StatusBadge variant={statusVariant[status] ?? "neutral"}>
            {formatStatus(status)}
          </StatusBadge>
        </div>
      </div>

      {/* Content below image */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div className="flex flex-col gap-0.5">
          {/* Supplier / title */}
          <p
            className={cn(
              "text-sm font-medium text-text-primary line-clamp-1",
              isVoided && "line-through",
            )}
          >
            {displayName}
          </p>

          {/* Category — always takes space for consistent height */}
          <p className="text-xs text-text-muted line-clamp-1">
            {category ?? "\u00A0"}
          </p>
        </div>

        {/* Amount — pushed to bottom */}
        <p
          className={cn(
            "mt-2 text-xl font-bold tabular-nums",
            isVoided ? "text-text-muted line-through" : "text-text-primary",
          )}
        >
          {formatPHP(amount)}
        </p>
      </div>

    </div>
  );
}
