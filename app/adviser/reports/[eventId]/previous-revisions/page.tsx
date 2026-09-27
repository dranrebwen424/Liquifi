import { notFound } from "next/navigation";
import { ReportPreviousRevisions } from "@/components/reports/ReportPreviousRevisions";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getAllReportsByEvent } from "@/lib/queries/reports";

type Props = { params: Promise<{ eventId: string }> };

export default async function Page({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("adviser");
  const event = await getEventDashboard(eventId);
  if (!event || !user.departmentId || event.department_id !== user.departmentId) notFound();
  const reports = (await getAllReportsByEvent(eventId, user.departmentId)).slice(1);
  return <ReportPreviousRevisions role="adviser" reports={reports} eventId={eventId} />;
}
