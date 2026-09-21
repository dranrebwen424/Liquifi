import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10 pt-3">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/departments"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-lg font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Back to departments"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Approvals
        </Link>
        <p className="text-xs text-text-muted">
          Total of {pending.length} Pending user{pending.length === 1 ? "" : "s"}
        </p>
      </div>

      <AdminApprovalsClient applicants={pending} />
    </div>
  );
}
