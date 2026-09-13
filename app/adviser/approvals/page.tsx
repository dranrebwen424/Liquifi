import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";
import { AdviserApprovalsClient } from "@/components/adviser/AdviserApprovalsClient";
import { sortApprovalInboxEntries } from "@/lib/adviser-approval-inbox";

export const dynamic = "force-dynamic";

const QUEUE_ERROR = "Couldn’t load this queue. Please try again.";

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function nullableStringValue(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export default async function AdviserApprovalsPage() {
  const actor = await requireRole("adviser");
  const insforge = await createInsforgeServer();
  const queueErrors: { expenses?: string; users?: string } = {};

  if (!actor.departmentId) {
    queueErrors.expenses = "Your adviser account is not assigned to a department.";
    queueErrors.users = queueErrors.expenses;

    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <AdviserApprovalsClient pendingUsers={[]} pendingEntries={[]} queueErrors={queueErrors} />
      </div>
    );
  }

  // ── Pending treasurer applicants (same department) ──────────────
  const { data: applicants, error: applicantsError } = await insforge.database
    .from("users")
    .select("id, first_name, last_name, email, created_at")
    .eq("role", "treasurer")
    .eq("account_status", "pending_approval")
    .eq("department_id", actor.departmentId)
    .order("created_at", { ascending: false });

  if (applicantsError) {
    console.error("[adviser/approvals] users queue failed:", applicantsError);
    queueErrors.users = QUEUE_ERROR;
  }

  const pendingUsers =
    applicantsError ? [] : applicants?.map((a: Record<string, unknown>) => ({
      id: stringValue(a, "id"),
      first_name: stringValue(a, "first_name"),
      last_name: stringValue(a, "last_name"),
      email: stringValue(a, "email"),
      created_at: stringValue(a, "created_at"),
    })) ?? [];

  // ── Pending manual entries ────────────────────────────────────
  // First get event IDs for this department, then filter entries by those events
  const { data: deptEvents, error: deptEventsError } = await insforge.database
    .from("events")
    .select("id, name")
    .eq("department_id", actor.departmentId)
    .neq("status", "archived");

  if (deptEventsError) {
    console.error("[adviser/approvals] event scope failed:", deptEventsError);
    queueErrors.expenses = QUEUE_ERROR;
  }

  const deptEventIds = deptEventsError
    ? []
    : (deptEvents ?? []).map((e: Record<string, unknown>) => stringValue(e, "id"));
  const eventNameMap: Record<string, string> = {};
  for (const event of deptEvents ?? []) {
    const row = event as Record<string, unknown>;
    eventNameMap[stringValue(row, "id")] = stringValue(row, "name");
  }

  let entries: Record<string, unknown>[] = [];
  if (!queueErrors.expenses && deptEventIds.length > 0) {
    const { data, error: entriesError } = await insforge.database
      .from("entries")
      .select("id, event_id, created_by, created_at, type, status, amount, category, image_url, document_type_raw, document_type_category, document_number, issue_date, issue_time, supplier_name, item_breakdown, form_payload_json, computed_breakdown_json, rejection_reason, resubmission_explanation, causes_overspend, overspend_explanation")
      .in("status", ["pending_approval", "resubmitted"])
      .eq("type", "manual")
      .in("event_id", deptEventIds)
      .order("created_at", { ascending: true });

    if (entriesError) {
      console.error("[adviser/approvals] expenses queue failed:", entriesError);
      queueErrors.expenses = QUEUE_ERROR;
    } else {
      entries = data ?? [];
    }
  }

  // Resolve creator names — batch fetch unique user IDs
  const creatorIds = [...new Set(entries.map((e) => stringValue(e, "created_by")))].filter(Boolean);
  let creatorMap: Record<string, string> = {};

  if (!queueErrors.expenses && creatorIds.length > 0) {
    const { data: creators, error: creatorsError } = await insforge.database
      .from("users")
      .select("id, first_name, last_name")
      .in("id", creatorIds);

    if (creatorsError) {
      console.error("[adviser/approvals] creator lookup failed:", creatorsError);
      queueErrors.expenses = QUEUE_ERROR;
    } else if (creators) {
      creatorMap = Object.fromEntries(
        creators.map((u: Record<string, unknown>) => [
          stringValue(u, "id"),
          `${stringValue(u, "first_name")} ${stringValue(u, "last_name")}`,
        ]),
      );
    }
  }

  const pendingEntries = queueErrors.expenses
    ? []
    : sortApprovalInboxEntries(entries.map((e) => {
      const eventId = stringValue(e, "event_id");
      const creatorId = stringValue(e, "created_by");

      return {
        id: stringValue(e, "id"),
        event_id: eventId,
        event_name: eventNameMap[eventId] ?? "Unknown event",
        created_by_name: creatorMap[creatorId] ?? null,
        amount: numberValue(e, "amount"),
        category: nullableStringValue(e, "category"),
        resubmission_explanation: nullableStringValue(e, "resubmission_explanation"),
        created_at: stringValue(e, "created_at"),
        type: "manual" as const,
        status: stringValue(e, "status") === "resubmitted" ? "resubmitted" as const : "pending_approval" as const,
        imageUrl: nullableStringValue(e, "image_url"),
        documentType: nullableStringValue(e, "document_type_raw"),
        documentNumber: nullableStringValue(e, "document_number"),
        issueDate: nullableStringValue(e, "issue_date"),
        issueTime: nullableStringValue(e, "issue_time"),
        supplierName: nullableStringValue(e, "supplier_name"),
        itemBreakdown: e.item_breakdown,
        formPayload: e.form_payload_json,
        rejectionReason: nullableStringValue(e, "rejection_reason"),
        causesOverspend: Boolean(e.causes_overspend),
        overspendExplanation: nullableStringValue(e, "overspend_explanation"),
      };
    }));

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
        queueErrors={queueErrors}
      />
    </div>
  );
}
