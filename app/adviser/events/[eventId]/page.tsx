import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getLatestReportByEvent } from "@/lib/queries/reports";
import { ReadOnlyEventView } from "@/components/events/ReadOnlyEventView";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
};

// Adviser read-only view of an event dashboard. Shares ReadOnlyEventView with
// the admin department workspace, so the two cannot drift apart.
export default async function AdviserEventPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("adviser");

  // Both reads are independent — fetch in parallel (same total queries).
  const [event, latestReport] = await Promise.all([
    getEventDashboard(eventId),
    getLatestReportByEvent(eventId),
  ]);
  if (!event) notFound();

  // Cross-department guard (belt-and-suspenders on top of RLS)
  if (user.departmentId && event.department_id !== user.departmentId) {
    notFound();
  }

  return (
    <ReadOnlyEventView
      event={event}
      latestReport={latestReport}
      backHref="/adviser/home"
      reportHref={`/adviser/reports/${eventId}`}
    />
  );
}
