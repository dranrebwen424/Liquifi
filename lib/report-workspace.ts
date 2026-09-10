import type { EventStatus, ReportStatus } from "@/types";

export type ReportWorkspaceState =
  | "empty"
  | "rejected"
  | "cancelled"
  | "pending"
  | "approved"
  | "archived";

export type ReportWorkspaceView = {
  state: ReportWorkspaceState;
  step: 1 | 2 | 3;
};

export function getReportWorkspaceState(
  eventStatus: EventStatus,
  reportStatus: ReportStatus | null,
): ReportWorkspaceView {
  if (eventStatus === "archived") return { state: "archived", step: 3 };
  if (reportStatus === "pending_adviser_approval") {
    return { state: "pending", step: 2 };
  }
  if (reportStatus === "approved") return { state: "approved", step: 3 };
  if (reportStatus === "rejected") return { state: "rejected", step: 1 };
  if (reportStatus === "cancelled") return { state: "cancelled", step: 1 };
  return { state: "empty", step: 1 };
}
