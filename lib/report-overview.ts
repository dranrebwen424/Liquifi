import type { EventStatus, ReportStatus, Role } from "@/types";

export type ReportOverviewRole = Extract<Role, "treasurer" | "adviser">;
export type ReportOverviewFilter = "all" | "pending" | "approved" | "rejected";

export type ReportOverviewItem = {
  eventId: string;
  eventName: string;
  eventStatus: EventStatus;
  createdAt: string;
  report: {
    id: string;
    fsDocumentNumber: string;
    status: ReportStatus;
    generatedAt: string;
  } | null;
};

const newestFirst = (a: ReportOverviewItem, b: ReportOverviewItem): number =>
  (b.report?.generatedAt ?? b.createdAt).localeCompare(
    a.report?.generatedAt ?? a.createdAt,
  );

export function getFeaturedReportItems(
  items: ReportOverviewItem[],
  role: ReportOverviewRole,
): ReportOverviewItem[] {
  const status = role === "adviser" ? "pending_adviser_approval" : "approved";
  return items
    .filter(
      (item) => item.eventStatus === "open" && item.report?.status === status,
    )
    .sort(newestFirst);
}

export function getActionRequiredReport(
  items: ReportOverviewItem[],
  role: ReportOverviewRole,
): ReportOverviewItem | null {
  if (role !== "treasurer") return null;
  return (
    items
      .filter(
        (item) =>
          item.eventStatus === "open" && item.report?.status === "rejected",
      )
      .sort(newestFirst)[0] ?? null
  );
}

export function filterReportItems(
  items: ReportOverviewItem[],
  filter: ReportOverviewFilter,
): ReportOverviewItem[] {
  return items
    .filter((item) => {
      if (item.eventStatus === "archived") return false;
      if (filter === "all") return true;
      if (filter === "pending") {
        return item.report?.status === "pending_adviser_approval";
      }
      return item.report?.status === filter;
    })
    .sort(newestFirst);
}
