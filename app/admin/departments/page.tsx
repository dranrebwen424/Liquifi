import { createInsforgeServer } from "@/lib/insforge-server";
import { DepartmentsListClient, type DepartmentWithUsers } from "@/components/admin/DepartmentsListClient";

export default async function DepartmentsPage() {
  const insforge = await createInsforgeServer();

  const { data: departments } = await insforge.database
    .from("departments")
    .select("id, name, code, is_active, created_at")
    .order("name", { ascending: true });

  // Fetch active adviser/treasurer users per department (derived, not stored)
  const { data: activeUsers } = await insforge.database
    .from("users")
    .select("id, first_name, last_name, role, department_id")
    .eq("account_status", "active")
    .in("role", ["adviser", "treasurer"]);

  // Map users to departments
  const deptUsers = new Map<string, { adviser: string | null; treasurer: string | null }>();
  for (const user of activeUsers ?? []) {
    if (!deptUsers.has(user.department_id)) {
      deptUsers.set(user.department_id, { adviser: null, treasurer: null });
    }
    const entry = deptUsers.get(user.department_id)!;
    const fullName = `${user.first_name} ${user.last_name}`;
    if (user.role === "adviser") entry.adviser = fullName;
    if (user.role === "treasurer") entry.treasurer = fullName;
  }

  const departmentsWithUsers: DepartmentWithUsers[] = (departments ?? []).map((dept) => {
    const users = deptUsers.get(dept.id) ?? { adviser: null, treasurer: null };
    return { ...dept, ...users };
  });

  return <DepartmentsListClient initialDepartments={departmentsWithUsers} />;
}
