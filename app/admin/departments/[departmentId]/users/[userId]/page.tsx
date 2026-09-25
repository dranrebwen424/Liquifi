import { notFound } from "next/navigation";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getAvatarUrl } from "@/lib/storage";
import { AdminMemberProfile } from "@/components/admin/AdminMemberProfile";

export default async function AdminMemberProfilePage({
  params,
}: {
  params: Promise<{ departmentId: string; userId: string }>;
}) {
  const { departmentId, userId } = await params;
  const insforge = await createInsforgeServer();

  const [departmentRes, memberRes] = await Promise.all([
    insforge.database
      .from("departments")
      .select("id, name, code, is_active")
      .eq("id", departmentId)
      .maybeSingle(),
    insforge.database
      .from("users")
      .select(
        "id, first_name, middle_name, last_name, email, role, account_status, department_id, avatar_key, approved_at",
      )
      .eq("id", userId)
      .eq("department_id", departmentId)
      .maybeSingle(),
  ]);

  const department = departmentRes.data;
  const member = memberRes.data;

  if (!department || !member) notFound();

  return (
    <AdminMemberProfile
      department={department}
      member={member}
      avatarUrl={getAvatarUrl(member.avatar_key, insforge)}
    />
  );
}