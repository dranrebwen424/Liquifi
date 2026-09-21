import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UsersRound } from "lucide-react";
import { DepartmentMemberCard } from "@/components/admin/DepartmentMemberCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  sortDepartmentMembers,
  type DepartmentMemberRole,
  type DepartmentMemberSummary,
} from "@/lib/admin-department-users";

export async function DepartmentRoleUsersPage({
  departmentId,
  role,
  title,
}: {
  departmentId: string;
  role: DepartmentMemberRole;
  title: "Treasurers" | "Advisers";
}) {
  const insforge = await createInsforgeServer();
  const [departmentResult, membersResult] = await Promise.all([
    insforge.database
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .maybeSingle(),
    insforge.database
      .from("users")
      .select("id, first_name, last_name, email, role, account_status, created_at")
      .eq("department_id", departmentId)
      .eq("role", role)
      .order("created_at", { ascending: false }),
  ]);

  if (departmentResult.error) throw departmentResult.error;
  if (membersResult.error) throw membersResult.error;
  if (!departmentResult.data) notFound();

  const members: DepartmentMemberSummary[] = (membersResult.data ?? []).map((member) => ({
    ...member,
    role,
  }));
  const sortedMembers = sortDepartmentMembers(members);
  const roleName = title.toLowerCase();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10 pt-6">
      <Link
        href={`/admin/departments/${departmentId}?tab=users`}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-lg font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {title}
      </Link>

      {sortedMembers.length ? (
        <div className="flex flex-col gap-2">
          {sortedMembers.map((member) => (
            <DepartmentMemberCard key={member.id} departmentId={departmentId} user={member} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UsersRound aria-hidden="true" />}
          title={`No ${roleName}`}
          description={`This department has no ${roleName} yet.`}
        />
      )}
    </div>
  );
}
