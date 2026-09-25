import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DepartmentMemberSummary } from "@/lib/admin-department-users";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending_approval: "Pending approval",
  deactivated: "Deactivated",
  rejected: "Rejected",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-success-light text-success-dark",
  pending_approval: "bg-warning-light text-warning-dark",
  deactivated: "bg-neutral-light text-neutral-foreground",
  rejected: "bg-error-light text-error-dark",
};

export function DepartmentMemberCard({
  departmentId,
  user,
}: {
  departmentId: string;
  user: DepartmentMemberSummary;
}) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = user.role === "treasurer" ? "Treasurer" : "Adviser";
  const statusLabel = STATUS_LABELS[user.account_status]
    ?? user.account_status.replaceAll("_", " ");

  return (
    <Link
      href={`/admin/departments/${departmentId}/users/${user.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-light text-sm font-semibold text-accent">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {fullName}
        </span>
        <span className="block truncate text-xs text-text-muted">{user.email}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-text-secondary">{roleLabel}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
              STATUS_CLASSES[user.account_status] ?? "bg-neutral-light text-neutral-foreground",
            )}
          >
            {statusLabel}
          </span>
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary"
        aria-hidden="true"
      />
    </Link>
  );
}
