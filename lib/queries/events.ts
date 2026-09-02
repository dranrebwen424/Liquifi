import { cache } from "react";
import { createInsforgeServer } from "@/lib/insforge-server";
import { deriveBudgetLocked } from "@/lib/budget-lock";
import { isUnresolvedOverspendEntry } from "@/lib/overspend";
import type { EventStatus } from "@/types";

// ─── Computed event type (what the UI needs) ─────────────────────────
export type EventWithMeta = {
  id: string;
  name: string;
  department_id: string;
  status: EventStatus;
  budget_total: number;
  total_spent: number;
  num_entries: number;
  is_locked: boolean;
  budget_locked: boolean;
  has_unresolved_overspend: boolean;
  num_locked: number;
  created_at: string;
  created_by: string;
  created_by_name: string;
};

export type EntryForDashboard = {
  id: string;
  type: "receipt" | "manual";
  status:
    | "draft"
    | "ai_parsed"
    | "treasurer_reviewed"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "resubmitted"
    | "discarded"
    | "voided"
    | "deducted";
  amount: number;
  supplier_name?: string | null;
  document_type_raw?: string | null;
  document_number?: string | null;
  issue_date?: string | null;
  issue_time?: string | null;
  category?: string | null;
  image_url?: string | null;
  item_breakdown?: unknown;
  form_payload_json?: unknown;
  rejection_reason?: string | null;
  resubmission_explanation?: string | null;
  created_at?: string;
  void_reason?: string | null;
  voided_by?: string | null;
  voided_at?: string | null;
  causes_overspend?: boolean | null;
  overspend_explanation?: string | null;
  overspend_resolved_at?: string | null;
  voidedByName?: string | null;
};

/** Fetch all events for a department with computed `total_spent` and `is_locked`. */
// ponytail: React cache() dedupes identical same-function calls within a single
// render pass. Today each page calls each query once, so this guards against
// future duplicate fetches (e.g. a nested Server Component fetching the event
// while the page payload already includes it) — and it's render-scoped, so
// mutations (Server Actions trigger their own re-render) never serve stale data.
export const getDepartmentEvents = cache(async function getDepartmentEvents(
  departmentId: string,
): Promise<EventWithMeta[]> {
  const insforge = await createInsforgeServer();

  const { data: events, error } = await insforge.database
    .from("events")
    .select("id, name, department_id, status, budget_total, created_at, created_by")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false });

  if (error || !events) {
    console.error("[queries/events] fetch failed:", error);
    return [];
  }

  // Batch-fetch all entries for these events (one query instead of two)
  const eventIds = events.map((e: { id: string }) => e.id);

  const { data: entryRows } = await insforge.database
    .from("entries")
    .select("event_id, amount, status, causes_overspend, overspend_resolved_at")
    .in("event_id", eventIds);

  const spentMap: Record<string, number> = {};
  const entryCountMap: Record<string, number> = {};
  const anyEntryIds = new Set<string>();
  const overspendEventIds = new Set<string>();
  if (entryRows) {
    for (const row of entryRows) {
      entryCountMap[row.event_id] = (entryCountMap[row.event_id] ?? 0) + 1;
      if (row.status === "deducted") {
        spentMap[row.event_id] = (spentMap[row.event_id] ?? 0) + Number(row.amount);
      }
      // Budget locks once ANY entry exists (any status) — see lib/budget-lock.ts
      if (deriveBudgetLocked([row.status])) {
        anyEntryIds.add(row.event_id);
      }
      if (isUnresolvedOverspendEntry(row.status, row.causes_overspend, row.overspend_resolved_at)) {
        overspendEventIds.add(row.event_id);
      }
    }
  }

  // Check which events have pending/approved reports (is_locked)
  const { data: reportRows } = await insforge.database
    .from("reports")
    .select("event_id")
    .in("event_id", eventIds)
    .in("status", ["pending_adviser_approval", "approved"]);

  // ponytail: using Set for O(1) lookup
  const lockedEventIds = new Set<string>();
  if (reportRows) {
    for (const row of reportRows) {
      lockedEventIds.add(row.event_id);
    }
  }

  // Which events have at least one entry (budget_locked)
  const budgetLockedIds = anyEntryIds;

  // Batch-fetch creator names
  const creatorIds = [...new Set(events.map((e: { created_by: string }) => e.created_by).filter(Boolean))];
  const nameMap: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: users } = await insforge.database
      .from("users")
      .select("id, first_name, last_name")
      .in("id", creatorIds);
    if (users) {
      for (const u of users) {
        nameMap[u.id] = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unknown";
      }
    }
  }

  return events.map((e: { id: string; name: string; department_id: string; status: string; budget_total: number; created_at: string; created_by: string }) => ({
    id: e.id,
    name: e.name,
    department_id: e.department_id,
    status: e.status as EventStatus,
    budget_total: Number(e.budget_total),
    total_spent: spentMap[e.id] ?? 0,
    num_entries: entryCountMap[e.id] ?? 0,
    is_locked: lockedEventIds.has(e.id),
    budget_locked: budgetLockedIds.has(e.id),
    has_unresolved_overspend: overspendEventIds.has(e.id),
    num_locked: 0,
    created_at: e.created_at,
    created_by: e.created_by,
    created_by_name: nameMap[e.created_by] ?? "Unknown",
  }));
});

/** Fetch a single event with its entries for the dashboard. */
// cache(): dedupes identical same-function calls within a render pass — guards
// against nested Server Components re-fetching the same event in one request tree.
export const getEventDashboard = cache(async function getEventDashboard(
  eventId: string,
) {
  const insforge = await createInsforgeServer();

  const { data: event, error } = await insforge.database
    .from("events")
    .select("id, name, department_id, status, budget_total, created_at, created_by")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) return null;

  const status = event.status as EventStatus;

  // Entries for this event
  const { data: entries } = await insforge.database
    .from("entries")
    .select(
      "id, type, status, amount, supplier_name, document_type_raw, document_number, issue_date, issue_time, category, image_url, item_breakdown, form_payload_json, rejection_reason, resubmission_explanation, created_at, void_reason, voided_by, voided_at, causes_overspend, overspend_explanation, overspend_resolved_at",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Spent from deducted entries
  const totalSpent = (entries ?? [])
    .filter((r: { status: string }) => r.status === "deducted")
    .reduce((acc: number, r: { amount: number }) => acc + Number(r.amount), 0);

  // Resolve voided_by names in one batch (entries may reference multiple users)
  const voidedByIds = [
    ...new Set((entries ?? []).map((r: { voided_by?: string | null }) => r.voided_by).filter(Boolean)),
  ];
  const voidedNameMap: Record<string, string> = {};
  if (voidedByIds.length > 0) {
    const { data: voiders } = await insforge.database
      .from("users")
      .select("id, first_name, last_name")
      .in("id", voidedByIds);
    if (voiders) {
      for (const v of voiders) {
        voidedNameMap[v.id] = [v.first_name, v.last_name].filter(Boolean).join(" ") || "Unknown";
      }
    }
  }

  // Check if locked by a report
  const { data: report } = await insforge.database
    .from("reports")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ["pending_adviser_approval", "approved"])
    .maybeSingle();

  const isLocked = !!report;
  const budgetLocked = deriveBudgetLocked((entries ?? []).map((r: { status: string }) => r.status));
  const hasUnresolvedOverspend = (entries ?? []).some(
    (r: { status: string; causes_overspend?: boolean | null; overspend_resolved_at?: string | null }) =>
      isUnresolvedOverspendEntry(r.status, r.causes_overspend, r.overspend_resolved_at),
  );

  // Fetch creator name
  let createdByName = "Unknown";
  if (event.created_by) {
    const { data: creator } = await insforge.database
      .from("users")
      .select("first_name, last_name")
      .eq("id", event.created_by)
      .maybeSingle();
    if (creator) {
      createdByName = [creator.first_name, creator.last_name].filter(Boolean).join(" ") || "Unknown";
    }
  }

  return {
    id: event.id,
    name: event.name,
    department_id: event.department_id,
    status,
    budget_total: Number(event.budget_total),
    total_spent: totalSpent,
    is_locked: isLocked,
    budget_locked: budgetLocked,
    has_unresolved_overspend: hasUnresolvedOverspend,
    created_at: event.created_at,
    created_by_name: createdByName,
    entries: (entries ?? []).map((e) => ({
      ...e,
      voidedByName: e.voided_by ? (voidedNameMap[e.voided_by] ?? null) : null,
    })) as EntryForDashboard[],
  };
});
