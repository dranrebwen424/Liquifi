import { cache } from "react";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { ReportStatus } from "@/types";

/** Latest Report row for an event, if any. Ordered by generated_at desc. */
export type ReportForDashboard = {
  id: string;
  event_id: string;
  fs_document_number: string;
  status: ReportStatus;
  revision_count: number;
  generated_at: string;
};

/**
 * Every Report row for an event, newest first. Reports are never overwritten:
 * a regenerated report is a new row with revision_count+1, so the full stack
 * is the event's report history (rejected/cancelled/approved all present).
 *
 * cache(): dedupes identical same-function calls within a render pass — guards
 * against nested Server Components re-fetching the same report in one request tree.
 */
export const getAllReportsByEvent = cache(async function getAllReportsByEvent(
  eventId: string,
): Promise<ReportForDashboard[]> {
  const insforge = await createInsforgeServer();

  const { data, error } = await insforge.database
    .from("reports")
    .select(
      "id, event_id, fs_document_number, status, revision_count, generated_at",
    )
    .eq("event_id", eventId)
    .order("generated_at", { ascending: false });

  if (error || !data) return [];
  return data as ReportForDashboard[];
});

export const getLatestReportByEvent = cache(async function getLatestReportByEvent(
  eventId: string,
): Promise<ReportForDashboard | null> {
  const insforge = await createInsforgeServer();

  const { data, error } = await insforge.database
    .from("reports")
    .select(
      "id, event_id, fs_document_number, status, revision_count, generated_at",
    )
    .eq("event_id", eventId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReportForDashboard;
});

/**
 * Latest Report per event, batched — for the treasurer reports list page.
 * One query, then keeps only the newest row per event (reports are never
 * overwritten; a regenerated report is a new row with revision_count+1).
 *
 * An event whose newest report is `cancelled` maps to NOTHING: cancelling
 * puts the event back to "no report yet" (unlocked, regeneration allowed),
 * so it must not appear in the "With reports" section. The cancelled PDF
 * stays reachable on the detail page viewer.
 *
 * cache(): dedupes identical same-function calls within a render pass. Note this
 * does NOT remove the reports query inside getDepartmentEvents (a different
 * function/query) — cross-function redundancy is out of cache()'s scope.
 */
export const getLatestReportsByEvent = cache(
  async function getLatestReportsByEvent(
    eventIds: string[],
  ): Promise<Map<string, ReportForDashboard>> {
  if (eventIds.length === 0) return new Map();

  const insforge = await createInsforgeServer();

  const { data, error } = await insforge.database
    .from("reports")
    .select(
      "id, event_id, fs_document_number, status, revision_count, generated_at",
    )
    .in("event_id", eventIds)
    .order("generated_at", { ascending: false });

  if (error || !data) return new Map();

  const latest = new Map<string, ReportForDashboard>();
  for (const row of data) {
    if (!latest.has(row.event_id)) latest.set(row.event_id, row);
  }
  for (const [eventId, row] of latest) {
    if (row.status === "cancelled") latest.delete(eventId);
  }
  return latest;
  },
);
