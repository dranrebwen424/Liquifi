import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getLatestReportByEvent } from "@/lib/queries/reports";
import { AdviserReportReview } from "@/components/adviser/AdviserReportReview";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function AdviserReportReviewPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("adviser");

  const event = await getEventDashboard(eventId);
  if (!event) notFound();

  // Cross-department guard (belt-and-suspenders on top of RLS)
  if (user.departmentId && event.department_id !== user.departmentId) {
    notFound();
  }

  const report = await getLatestReportByEvent(eventId);
  if (!report) notFound();

  return <AdviserReportReview event={event} report={report} />;
}
