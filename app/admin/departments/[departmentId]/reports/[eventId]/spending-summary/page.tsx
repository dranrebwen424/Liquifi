import { notFound } from "next/navigation";
import { ReportSpendingSummary } from "@/components/reports/ReportSpendingSummary";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";

type Props = { params: Promise<{ departmentId: string; eventId: string }> };

export default async function AdminReportSpendingSummaryPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");
  const event = await getEventDashboard(eventId);
  if (!event || event.department_id !== departmentId) notFound();
  return (
    <ReportSpendingSummary event={event}
      backHref={`/admin/departments/${departmentId}/reports/${eventId}`} />
  );
}
