import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { AdminApprovalsClient } from "@/components/admin/AdminApprovalsClient";

export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  await requireRole("admin");
  const insforge = await createInsforgeServer();

  // Fetch pending adviser applicants with department name
  const { data: applicants } = await insforge.database
    .from("users")
    .select("id, first_name, last_name, email, department_id, created_at, departments(name)")
    .eq("role", "adviser")
    .eq("account_status", "pending_approval")
    .order("created_at", { ascending: false });

  // Normalise to a flat shape for the client
  const pending =
    applicants?.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      first_name: a.first_name as string,
      last_name: a.last_name as string,
      email: a.email as string,
      department_id: a.department_id as string | null,
      department_name:
        (a.departments as { name?: string } | null)?.name ?? null,
      created_at: a.created_at as string,
    })) ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
          Approvals
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Review pending adviser signups
        </p>
      </div>

      <AdminApprovalsClient applicants={pending} />
    </div>
  );
}
