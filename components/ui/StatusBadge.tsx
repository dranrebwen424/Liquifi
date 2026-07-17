import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-accent-light text-accent",
  success: "bg-success-lightest text-success-foreground",
  warning: "bg-warning-lightest text-warning-foreground",
  error: "bg-error-lightest text-error-foreground",
  info: "bg-info-lightest text-info-foreground",
  neutral: "bg-neutral-light text-text-muted",
};

type StatusBadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function StatusBadge({
  variant = "default",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── Preset mappers ────────────────────────────────────────────────

const accountStatusVariant: Record<string, BadgeVariant> = {
  pending_approval: "warning",
  active: "success",
  deactivated: "neutral",
  rejected: "neutral",
};

const eventStatusVariant: Record<string, BadgeVariant> = {
  open: "success",
  archived: "neutral",
};

const entryStatusVariant: Record<string, BadgeVariant> = {
  draft: "info",
  ai_parsed: "info",
  treasurer_reviewed: "info",
  pending_approval: "warning",
  resubmitted: "warning",
  approved: "success",
  deducted: "success",
  rejected: "error",
  discarded: "error",
  voided: "error",
};

const reportStatusVariant: Record<string, BadgeVariant> = {
  pending_adviser_approval: "warning",
  approved: "success",
  rejected: "error",
  cancelled: "error",
};

const roleVariant: Record<string, BadgeVariant> = {
  admin: "default",
  adviser: "info",
  treasurer: "success",
};

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AccountStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge variant={accountStatusVariant[status] ?? "neutral"}>
      {formatLabel(status)}
    </StatusBadge>
  );
}

export function EventStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge variant={eventStatusVariant[status] ?? "neutral"}>
      {formatLabel(status)}
    </StatusBadge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <StatusBadge variant={roleVariant[role] ?? "default"}>
      {formatLabel(role)}
    </StatusBadge>
  );
}
