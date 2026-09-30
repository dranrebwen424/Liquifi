import type { createInsforgeServer } from "@/lib/insforge-server";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;

export type ApprovalInboxEntry = {
  id: string;
  status: "pending_approval" | "resubmitted";
  created_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parsedTime(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export function sortApprovalInboxEntries<T extends ApprovalInboxEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    const statusDelta = Number(b.status === "resubmitted") - Number(a.status === "resubmitted");
    if (statusDelta !== 0) return statusDelta;

    const timeDelta = parsedTime(a.created_at) - parsedTime(b.created_at);
    if (timeDelta !== 0) return timeDelta;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Total pending approvals, for the sidebar Approvals badge.
 *
 * Mirrors the two queues app/adviser/approvals/page.tsx renders — pending
 * treasurer applicants plus pending manual entries in non-archived department
 * events. Keep the filters identical to that page or the badge disagrees with
 * the queue the adviser is sent to.
 */
export async function countPendingApprovals(insforge: InsforgeServer, departmentId: string | null): Promise<number> {
  if (!departmentId) return 0;

  const [applicants, deptEvents] = await Promise.all([
    insforge.database
      .from("users")
      .select("id")
      .eq("role", "treasurer")
      .eq("account_status", "pending_approval")
      .eq("department_id", departmentId),
    insforge.database
      .from("events")
      .select("id")
      .eq("department_id", departmentId)
      .neq("status", "archived"),
  ]);

  if (applicants.error) console.error("[adviser/approval-count] applicants query failed:", applicants.error);
  if (deptEvents.error) console.error("[adviser/approval-count] event scope failed:", deptEvents.error);

  const eventIds = (deptEvents.data ?? [])
    .map((row) => (row as Record<string, unknown>).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (eventIds.length === 0) return applicants.data?.length ?? 0;

  const { data: entries, error: entriesError } = await insforge.database
    .from("entries")
    .select("id")
    .in("status", ["pending_approval", "resubmitted"])
    .eq("type", "manual")
    .in("event_id", eventIds);

  if (entriesError) console.error("[adviser/approval-count] entries query failed:", entriesError);
  return (applicants.data?.length ?? 0) + (entries?.length ?? 0);
}

export function formatOriginalSubmissionAge(createdAt: string, now = new Date()): string {
  const createdTime = Date.parse(createdAt);
  if (!Number.isFinite(createdTime)) return "Original submission date unavailable";

  const days = Math.max(0, Math.floor((now.getTime() - createdTime) / DAY_MS));
  if (days === 0) return "Original submission today";
  return `Original submission ${days} day${days === 1 ? "" : "s"} ago`;
}
