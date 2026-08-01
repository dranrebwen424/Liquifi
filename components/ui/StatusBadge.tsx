import { cn } from "@/lib/utils";
import type { ComponentProps, ElementType } from "react";
import {
  Clock,
  CircleCheckBig,
  CircleDot,
  CircleX,
  CircleMinus,
  Shield,
  BookOpen,
  Landmark,
} from "lucide-react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "neutral";

// ─── Bare icon: no background, no border, just colored icon ────────

const variantIconColor: Record<BadgeVariant, string> = {
  default: "text-accent",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  neutral: "text-neutral",
};

type StatusBadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
  icon: ElementType;
  label: string;
};

export function StatusBadge({
  variant = "default",
  icon: Icon,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={20} className={variantIconColor[variant]} />
    </span>
  );
}

// ─── Status → icon + variant mapping ───────────────────────────────

export type StatusEntry = { icon: ElementType; variant: BadgeVariant; label: string };

const accountStatusMap: Record<string, StatusEntry> = {
  pending_approval: { icon: Clock, variant: "warning", label: "Pending Approval" },
  active: { icon: CircleCheckBig, variant: "success", label: "Active" },
  deactivated: { icon: CircleMinus, variant: "neutral", label: "Deactivated" },
  rejected: { icon: CircleX, variant: "neutral", label: "Rejected" },
};

const eventStatusMap: Record<string, StatusEntry> = {
  open: { icon: CircleCheckBig, variant: "success", label: "Open" },
  archived: { icon: CircleMinus, variant: "neutral", label: "Archived" },
};

export const entryStatusMap: Record<string, StatusEntry> = {
  draft: { icon: CircleDot, variant: "info", label: "Draft" },
  ai_parsed: { icon: CircleDot, variant: "info", label: "AI Parsed" },
  treasurer_reviewed: { icon: CircleDot, variant: "info", label: "Treasurer Reviewed" },
  pending_approval: { icon: Clock, variant: "warning", label: "Pending Approval" },
  resubmitted: { icon: Clock, variant: "warning", label: "Resubmitted" },
  approved: { icon: CircleCheckBig, variant: "success", label: "Approved" },
  deducted: { icon: CircleCheckBig, variant: "success", label: "Deducted" },
  rejected: { icon: CircleX, variant: "error", label: "Rejected" },
  discarded: { icon: CircleX, variant: "error", label: "Discarded" },
  voided: { icon: CircleX, variant: "error", label: "Voided" },
};

export const reportStatusMap: Record<string, StatusEntry> = {
  pending_adviser_approval: { icon: Clock, variant: "warning", label: "Pending Approval" },
  approved: { icon: CircleCheckBig, variant: "success", label: "Approved" },
  rejected: { icon: CircleX, variant: "error", label: "Rejected" },
  cancelled: { icon: CircleX, variant: "error", label: "Cancelled" },
};

const roleMap: Record<string, StatusEntry> = {
  admin: { icon: Shield, variant: "default", label: "Admin" },
  adviser: { icon: BookOpen, variant: "info", label: "Adviser" },
  treasurer: { icon: Landmark, variant: "success", label: "Treasurer" },
};

// ─── Preset mappers ────────────────────────────────────────────────

function fallback(status: string): StatusEntry {
  return { icon: CircleMinus, variant: "neutral", label: status.replace(/_/g, " ") };
}

export function AccountStatusBadge({ status }: { status: string }) {
  const { icon, variant, label } = accountStatusMap[status] ?? fallback(status);
  return <StatusBadge icon={icon} variant={variant} label={label} />;
}

export function EventStatusBadge({ status }: { status: string }) {
  const { icon, variant, label } = eventStatusMap[status] ?? fallback(status);
  return <StatusBadge icon={icon} variant={variant} label={label} />;
}

export function RoleBadge({ role }: { role: string }) {
  const { icon, variant, label } = roleMap[role] ?? fallback(role);
  return <StatusBadge icon={icon} variant={variant} label={label} />;
}
