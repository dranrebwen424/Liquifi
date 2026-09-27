import { notFound } from "next/navigation";
import { ReportDetailHeader } from "@/components/reports/ReportDetailHeader";
import { SignedReportPages } from "@/components/reports/SignedReportPages";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getSignedReportByEvent } from "@/lib/queries/reports";

type Props = { params: Promise<{ eventId: string }> };

export default async function SignedReportPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("adviser");
  const event = await getEventDashboard(eventId);
  if (!event || !user.departmentId || event.department_id !== user.departmentId) notFound();

  const report = await getSignedReportByEvent(eventId, user.departmentId);
  const pageCount = report?.signed_document_urls?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <ReportDetailHeader eventId={eventId} title="Signed Report" role="adviser" />
      {pageCount > 0 ? (
        <>
          <p className="mb-6 text-xs leading-5 text-text-secondary">
            {report!.fs_document_number} · {pageCount} uploaded page{pageCount === 1 ? "" : "s"}
          </p>
          <SignedReportPages reportId={report!.id} pageCount={pageCount} />
        </>
      ) : (
        <EmptyState
          title="No signed report yet"
          description="The signed pages appear here once this event has been archived."
        />
      )}
    </div>
  );
}
