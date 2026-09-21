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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10 pt-2">
      <Link
        href="/admin/departments"
        className="flex w-fit items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Back to departments"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex flex-col justify-center leading-tight">
          <span className="text-lg font-medium text-text-primary">Pending Users</span>
          <span className="text-xs text-text-muted">
            Total of {pending.length} Pending user{pending.length === 1 ? "" : "s"}
          </span>
        </span>
      </Link>

      <AdminApprovalsClient applicants={pending} />
    </div>
  );
}
