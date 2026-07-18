import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import AdviserApprovalsClient from "@/components/adviser/AdviserApprovalsClient";

export const dynamic = "force-dynamic";

export default async function AdviserApprovalsPage() {
  const actor = await requireRole("adviser");
  const insforge = await createInsforgeServer();

  // ── Pending treasurer applicants (same department) ──────────────
  const { data: applicants } = await insforge.database
    .from("users")
    .select("id, first_name, last_name, email, created_at")
    .eq("role", "treasurer")
    .eq("account_status", "pending_approval")
    .eq("department_id", actor.departmentId)
    .order("created_at", { ascending: false });

  const pendingUsers =
    applicants?.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      first_name: a.first_name as string,
      last_name: a.last_name as string,
      email: a.email as string,
      created_at: a.created_at as string,
    })) ?? [];

  // ── Pending manual entries ────────────────────────────────────
  // First get event IDs for this department, then filter entries by those events
  const { data: deptEvents } = await insforge.database
    .from("events")
    .select("id, name")
    .eq("department_id", actor.departmentId)
    .neq("status", "archived");

  const deptEventIds = (deptEvents ?? []).map((e: Record<string, unknown>) => e.id as string);
  const eventNameMap: Record<string, string> = {};
  for (const e of deptEvents ?? []) {
    const ev = e as { id: string; name: string };
    eventNameMap[ev.id] = ev.name;
  }

  const { data: entries } = await insforge.database
    .from("entries")
    .select("id, event_id, created_by, created_at, amount, category")
    .eq("status", "pending_approval")
    .eq("type", "manual")
    .in("event_id", deptEventIds.length > 0 ? deptEventIds : ["__none__"])
    .order("created_at", { ascending: false });

  // Resolve creator names — batch fetch unique user IDs
  const creatorIds = [...new Set((entries ?? []).map((e) => (e as Record<string, unknown>).created_by as string))];
  let creatorMap: Record<string, string> = {};

  if (creatorIds.length > 0) {
    const { data: creators } = await insforge.database
      .from("users")
      .select("id, first_name, last_name")
      .in("id", creatorIds);

    if (creators) {
      creatorMap = Object.fromEntries(
        (creators as Array<{ id: string; first_name: string; last_name: string }>).map((u) => [
          u.id,
          `${u.first_name} ${u.last_name}`,
        ]),
      );
    }
  }

  const pendingEntries =
    (entries ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      event_id: e.event_id as string,
      event_name: eventNameMap[e.event_id as string] ?? "(unknown event)",
      created_by_name: creatorMap[e.created_by as string] ?? null,
      amount: e.amount as number,
      category: (e.category as string | null) ?? null,
      created_at: e.created_at as string,
    })) ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
          Approvals
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Review pending expenses and user signups
        </p>
      </div>

      <AdviserApprovalsClient
        pendingUsers={pendingUsers}
        pendingEntries={pendingEntries}
      />
    </div>
  );
}
