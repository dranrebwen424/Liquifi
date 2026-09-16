"use client";

import Link from "next/link";
import { UsersRound, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountStatusBadge, RoleBadge } from "@/components/ui/StatusBadge";

export type DepartmentMemberSummary = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  account_status: string;
};

export function DepartmentUsersTab({
  departmentId,
  users,
}: {
  departmentId: string;
  users: DepartmentMemberSummary[];
}) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={<UsersRound aria-hidden="true" />}
        title="No users"
        description="No users are associated with this department yet."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((user) => {
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        const initials = fullName
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <Link
            key={user.id}
            href={`/admin/departments/${departmentId}/users/${user.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text-primary">
                {fullName}
              </span>
              <span className="block truncate text-xs text-text-muted">{user.email}</span>
            </span>
            <span className="flex items-center gap-2">
              <RoleBadge role={user.role} />
              <AccountStatusBadge status={user.account_status} />
              <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}