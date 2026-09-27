import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getAllReportsByEvent } from "@/lib/queries/reports";
import { AdviserReportReview } from "@/components/adviser/AdviserReportReview";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ departmentId: string; eventId: string }>;
};

// Admin read-only view of the latest report for an event, sharing the adviser
// report presentation. Shows any report status including cancelled — the
// read-only view renders the status honestly. `role="admin"` omits the
// Approve/Reject controls and the destination links.
export default async function AdminReportPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");

  const event = await getEventDashboard(eventId);
  if (!event) notFound();

  // URL consistency guard: the event must belong to the department in the path
  if (event.department_id !== departmentId) notFound();

  const reports = await getAllReportsByEvent(eventId, departmentId);
  const report = reports[0] ?? null;

  return report ? (
    <AdviserReportReview event={event} report={report} role="admin" />
  ) : (
    <div className="rounded-xl border border-border bg-surface">
      <EmptyState
        icon={<FileText />}
        title="No report yet"
        description="No report has been generated for this event."
        className="py-16"
      />
    </div>
  );
}
