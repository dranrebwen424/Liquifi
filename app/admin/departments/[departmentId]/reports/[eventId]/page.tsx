import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getLatestReportByEvent } from "@/lib/queries/reports";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ departmentId: string; eventId: string }>;
};

// Admin read-only view of the latest report for an event. Shows any report
// status including cancelled — the read-only view renders the status honestly.
export default async function AdminReportPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");

  const event = await getEventDashboard(eventId);
  if (!event) notFound();

  // URL consistency guard: the event must belong to the department in the path
  if (event.department_id !== departmentId) notFound();

  const report = await getLatestReportByEvent(eventId);
  const isArchived = event.status === "archived";

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Back link */}
      <Link
        href={`/admin/departments/${departmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to department
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-primary md:text-[28px]">
              {event.name}
            </h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-xs text-text-muted">Financial report</p>
        </div>
      </div>

      {report ? (
        <ReportViewer report={report} isArchived={isArchived} readOnly />
      ) : (
        <EmptyState
          icon={<FileText />}
          title="No report yet"
          description="No report has been generated for this event."
          className="rounded-xl border border-border bg-surface py-16"
        />
      )}
    </div>
  );
}
