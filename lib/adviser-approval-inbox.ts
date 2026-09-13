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

export function formatOriginalSubmissionAge(createdAt: string, now = new Date()): string {
  const createdTime = Date.parse(createdAt);
  if (!Number.isFinite(createdTime)) return "Original submission date unavailable";

  const days = Math.max(0, Math.floor((now.getTime() - createdTime) / DAY_MS));
  if (days === 0) return "Original submission today";
  return `Original submission ${days} day${days === 1 ? "" : "s"} ago`;
}
