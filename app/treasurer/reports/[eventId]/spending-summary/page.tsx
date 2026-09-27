import { notFound } from "next/navigation";
import { ReportSpendingSummary } from "@/components/reports/ReportSpendingSummary";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";

type Props = { params: Promise<{ eventId: string }> };

export default async function Page({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");
  const event = await getEventDashboard(eventId);
  if (!event || !user.departmentId || event.department_id !== user.departmentId) notFound();
  return <ReportSpendingSummary event={event} />;
}
