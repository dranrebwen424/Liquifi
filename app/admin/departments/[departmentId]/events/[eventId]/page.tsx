import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getLatestReportByEvent } from "@/lib/queries/reports";
import { ReadOnlyEventView } from "@/components/events/ReadOnlyEventView";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ departmentId: string; eventId: string }>;
};

// Admin read-only view of an event dashboard. Shares ReadOnlyEventView with
// the adviser page, so the two cannot drift apart; only the two links differ.
export default async function AdminEventPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");

  const [event, latestReport] = await Promise.all([
    getEventDashboard(eventId),
    getLatestReportByEvent(eventId),
  ]);
  if (!event) notFound();

  // URL consistency guard: the event must belong to the department in the path
  if (event.department_id !== departmentId) notFound();

  return (
    <ReadOnlyEventView
      event={event}
      latestReport={latestReport}
      backHref={`/admin/departments/${departmentId}`}
      reportHref={`/admin/departments/${departmentId}/reports/${eventId}`}
    />
  );
}
