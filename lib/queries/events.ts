import { createInsforgeServer } from "@/lib/insforge-server";
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
  created_at?: string;
  void_reason?: string | null;
  voided_by?: string | null;
  voided_at?: string | null;
};

/** Fetch all events for a department with computed `total_spent` and `is_locked`. */
export async function getDepartmentEvents(
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
    .select("event_id, amount, status")
    .in("event_id", eventIds);

  const spentMap: Record<string, number> = {};
  const entryCountMap: Record<string, number> = {};
  if (entryRows) {
    for (const row of entryRows) {
      entryCountMap[row.event_id] = (entryCountMap[row.event_id] ?? 0) + 1;
      if (row.status === "deducted") {
        spentMap[row.event_id] = (spentMap[row.event_id] ?? 0) + Number(row.amount);
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

  // Check which events have at least one deducted entry (budget_locked)
  const budgetLockedIds = new Set(Object.keys(spentMap));

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
    num_locked: 0,
    created_at: e.created_at,
    created_by: e.created_by,
    created_by_name: nameMap[e.created_by] ?? "Unknown",
  }));
}

/** Fetch a single event with its entries for the dashboard. */
export async function getEventDashboard(eventId: string) {
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
      "id, type, status, amount, supplier_name, document_type_raw, document_number, issue_date, issue_time, category, image_url, item_breakdown, created_at, void_reason, voided_by, voided_at",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // Spent from deducted entries
  const totalSpent = (entries ?? [])
    .filter((r: { status: string }) => r.status === "deducted")
    .reduce((acc: number, r: { amount: number }) => acc + Number(r.amount), 0);

  // Check if locked by a report
  const { data: report } = await insforge.database
    .from("reports")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ["pending_adviser_approval", "approved"])
    .maybeSingle();

  const isLocked = !!report;
  const budgetLocked = totalSpent > 0;

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
    created_at: event.created_at,
    created_by_name: createdByName,
    entries: (entries ?? []) as EntryForDashboard[],
  };
}
