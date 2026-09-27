import { notFound } from "next/navigation";
import { ReportPreviousRevisions } from "@/components/reports/ReportPreviousRevisions";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getAllReportsByEvent } from "@/lib/queries/reports";

type Props = { params: Promise<{ departmentId: string; eventId: string }> };

export default async function AdminReportPreviousRevisionsPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");
  const event = await getEventDashboard(eventId);
  if (!event || event.department_id !== departmentId) notFound();
  const reports = (await getAllReportsByEvent(eventId, departmentId)).slice(1);
  return (
    <ReportPreviousRevisions reports={reports} eventId={eventId}
      backHref={`/admin/departments/${departmentId}/reports/${eventId}`} />
  );
}
