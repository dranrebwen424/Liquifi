import { notFound } from "next/navigation";
import { createInsforgeServer } from "@/lib/insforge-server";
import { DepartmentDetailClient } from "@/components/admin/DepartmentDetailClient";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const insforge = await createInsforgeServer();

  // Fetch department
  const { data: department } = await insforge.database
    .from("departments")
    .select("id, name, code, is_active")
    .eq("id", departmentId)
    .single();

  if (!department) notFound();

  // Fetch users for this department
  const { data: users } = await insforge.database
    .from("users")
    .select("id, first_name, last_name, email, role, account_status")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: true });

  return (
    <DepartmentDetailClient
      department={department}
      initialUsers={users ?? []}
    />
  );
}
