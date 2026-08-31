import { notFound } from "next/navigation";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getDepartmentEvents } from "@/lib/queries/events";
import { getLatestReportsByEvent } from "@/lib/queries/reports";
import { DepartmentDetailClient } from "@/components/admin/DepartmentDetailClient";

export type AuditLogRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  actor_id: string | null;
  actor: string;
  actor_role: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type AuditActor = { id: string; name: string };

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

  // Audit logs — scoped to this department, newest first (Step 28)
  const { data: logs } = await insforge.database
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, metadata_json, created_at")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false })
    .limit(100);

  let auditLogs: AuditLogRow[] = [];
  if (logs && logs.length > 0) {
    // Resolve actor names (covers admins too — they act across departments)
    const actorIds = [...new Set(logs.map((log) => log.actor_id).filter(Boolean))];
    const { data: actors } = actorIds.length
      ? await insforge.database
          .from("users")
          .select("id, first_name, last_name, role")
          .in("id", actorIds)
      : { data: [] };
    const nameById = new Map(
      (actors ?? []).map((actor) => [
        actor.id,
        `${actor.first_name} ${actor.last_name}`.trim(),
      ]),
    );
    const roleById = new Map((actors ?? []).map((actor) => [actor.id, actor.role]));
    auditLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      actor_id: log.actor_id ?? null,
      actor: nameById.get(log.actor_id) ?? "Unknown",
      actor_role: roleById.get(log.actor_id) ?? null,
      metadata_json: log.metadata_json,
      created_at: log.created_at,
    }));
  }

  // Events + latest reports (Step 29) — real data for the Events/Reports tabs
  const events = await getDepartmentEvents(departmentId);
  const reportsByEvent = await getLatestReportsByEvent(
    events.map((event) => event.id),
  );
  const eventRows = events.map((event) => ({
    id: event.id,
    name: event.name,
    status: event.status,
    budget_total: event.budget_total,
    total_spent: event.total_spent,
    num_entries: event.num_entries,
    created_by_name: event.created_by_name,
    created_at: event.created_at,
  }));
  const reportRows = events
    .filter((event) => reportsByEvent.has(event.id))
    .map((event) => {
      const report = reportsByEvent.get(event.id)!;
      return {
        id: report.id,
        event_id: event.id,
        fs_document_number: report.fs_document_number,
        status: report.status,
        event_name: event.name,
      };
    });

  // Distinct actors for the audit-log "who" filter
  const auditActors = Array.from(
    new Map(auditLogs.map((log) => [log.actor_id, log])).values(),
  )
    .sort((a, b) => a.actor.localeCompare(b.actor))
    .map((log) => ({ id: log.actor_id ?? "unknown", name: log.actor }));

  return (
    <DepartmentDetailClient
      department={department}
      initialUsers={users ?? []}
      auditLogs={auditLogs}
      auditActors={auditActors}
      events={eventRows}
      reports={reportRows}
    />
  );
}
