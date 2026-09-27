import { notFound } from "next/navigation";
import { BudgetHistoryList } from "@/components/events/BudgetHistoryList";
import { ReportDetailHeader } from "@/components/reports/ReportDetailHeader";
import { requireRole } from "@/lib/auth-guard";
import { getBudgetProofsByEvent } from "@/lib/queries/budget-proofs";
import { getEventDashboard } from "@/lib/queries/events";

type Props = { params: Promise<{ eventId: string }> };

export default async function ReportBudgetHistoryPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("adviser");
  const event = await getEventDashboard(eventId);
  if (!event || !user.departmentId || event.department_id !== user.departmentId) notFound();
  const proofs = await getBudgetProofsByEvent(eventId, user.departmentId);

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <ReportDetailHeader role="adviser" eventId={eventId} title="Budget History" />
      <BudgetHistoryList proofs={proofs} />
    </div>
  );
}
