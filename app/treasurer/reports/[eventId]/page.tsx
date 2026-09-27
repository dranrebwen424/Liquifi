import { notFound } from "next/navigation";
import { TreasurerReportWorkspace } from "@/components/reports/TreasurerReportWorkspace";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getAllReportsByEvent, getEntryCommentsByReportIds } from "@/lib/queries/reports";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function ReportPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");
  const event = await getEventDashboard(eventId);
  if (!event || !user.departmentId || event.department_id !== user.departmentId) notFound();

  const reports = await getAllReportsByEvent(eventId, user.departmentId);
  const latestReport = reports[0] ?? null;
  // Entry notes only render inside the rejection card, and only the latest
  // review round's — so don't pay for the read on any other state.
  const entryComments =
    latestReport?.status === "rejected"
      ? await getEntryCommentsByReportIds([latestReport.id])
      : [];

  return (
    <TreasurerReportWorkspace
      event={event}
      latestReport={latestReport}
      entryComments={entryComments}
    />
  );
}
