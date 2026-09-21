import { DepartmentRoleUsersPage } from "@/components/admin/DepartmentRoleUsersPage";

export default async function AdvisersPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  return (
    <DepartmentRoleUsersPage
      departmentId={departmentId}
      role="adviser"
      title="Advisers"
    />
  );
}
