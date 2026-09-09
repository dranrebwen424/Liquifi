import { ReportsOverview } from "@/components/reports/ReportsOverview";
import { requireRole } from "@/lib/auth-guard";
import { getDepartmentEvents } from "@/lib/queries/events";
import { getLatestReportsByEvent } from "@/lib/queries/reports";

export const dynamic = "force-dynamic";

export default async function AdviserReportsPage() {
  const user = await requireRole("adviser");
  if (!user.departmentId) throw new Error("Adviser account is missing a department");

  const events = await getDepartmentEvents(user.departmentId);
  const reportMap = await getLatestReportsByEvent(events.map((event) => event.id));
  const items = events
    .map((event) => {
      const report = reportMap.get(event.id) ?? null;
      return {
        eventId: event.id,
        eventName: event.name,
        eventStatus: event.status,
        createdAt: event.created_at,
        report: report
          ? {
              id: report.id,
              fsDocumentNumber: report.fs_document_number,
              status: report.status,
              generatedAt: report.generated_at,
            }
          : null,
      };
    })
    .filter((item) => item.report !== null);

  return <ReportsOverview role="adviser" items={items} />;
}
