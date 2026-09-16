import { createInsforgeServer } from "@/lib/insforge-server";
import { DepartmentsListClient } from "@/components/admin/DepartmentsListClient";
import type { DepartmentSummary } from "@/lib/admin-departments";

export default async function DepartmentsPage() {
  const insforge = await createInsforgeServer();

  const [{ data: departments, error: deptError }, { data: activeUsers, error: usersError }] = await Promise.all([
    insforge.database
      .from("departments")
      .select("id, name, code, is_active, created_at")
      .order("name", { ascending: true }),
    insforge.database
      .from("users")
      .select("id, first_name, last_name, role, department_id")
      .eq("account_status", "active")
      .in("role", ["adviser", "treasurer"]),
  ]);

  const loadError = deptError
    ? "Failed to load departments. Please try again."
    : usersError
      ? "Departments loaded but staff data may be incomplete."
      : undefined;

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

  const departmentSummaries: DepartmentSummary[] = (departments ?? []).map((dept) => {
    const users = deptUsers.get(dept.id) ?? { adviser: null, treasurer: null };
    return { ...dept, ...users };
  });

  return <DepartmentsListClient initialDepartments={departmentSummaries} loadError={loadError} />;
}
