"use client";

import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { DepartmentMemberCard } from "@/components/admin/DepartmentMemberCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getDepartmentUserSections,
  searchDepartmentMembers,
  type DepartmentMemberSummary,
} from "@/lib/admin-department-users";

export type { DepartmentMemberSummary } from "@/lib/admin-department-users";

export function DepartmentUsersTab({
  departmentId,
  users,
  query,
}: {
  departmentId: string;
  users: DepartmentMemberSummary[];
  query: string;
}) {
  const normalizedQuery = query.trim();
  const sections = getDepartmentUserSections(users);
  const searchResults = searchDepartmentMembers(users, query);

  if (normalizedQuery) {
    return searchResults.length ? (
      <div className="flex flex-col gap-2">
        {searchResults.map((user) => (
          <DepartmentMemberCard key={user.id} departmentId={departmentId} user={user} />
        ))}
      </div>
    ) : (
      <EmptyState
        icon={<UsersRound aria-hidden="true" />}
        title="No matching users"
        description="No department users match your search."
      />
    );
  }

  const roleSections = [
    {
      title: "Treasurers",
      href: `/admin/departments/${departmentId}/users/treasurers`,
      members: sections.treasurers,
      empty: "No treasurers are associated with this department yet.",
    },
    {
      title: "Advisers",
      href: `/admin/departments/${departmentId}/users/advisers`,
      members: sections.advisers,
      empty: "No advisers are associated with this department yet.",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {roleSections.map(({ title, href, members, empty }) => (
        <section key={title} className="flex flex-col gap-3" aria-labelledby={`${title.toLowerCase()}-heading`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id={`${title.toLowerCase()}-heading`} className="text-base font-semibold text-text-primary">
                {title}
              </h2>
              <p className="text-xs text-text-muted">
                Total of {members.length} user{members.length === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              View all
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {members.length ? (
            <div className="flex flex-col gap-2">
              {members.slice(0, 3).map((user) => (
                <DepartmentMemberCard key={user.id} departmentId={departmentId} user={user} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
              {empty}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
