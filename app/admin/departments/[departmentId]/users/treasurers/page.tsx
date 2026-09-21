import { DepartmentRoleUsersPage } from "@/components/admin/DepartmentRoleUsersPage";

export default async function TreasurersPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  return (
    <DepartmentRoleUsersPage
      departmentId={departmentId}
      role="treasurer"
      title="Treasurers"
    />
  );
}
