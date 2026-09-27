import { notFound } from "next/navigation";
import { ExpensesSection } from "@/components/entries/ExpensesSection";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";

type Props = { params: Promise<{ departmentId: string; eventId: string }> };

export default async function AdminReportExpensesPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");
  const event = await getEventDashboard(eventId);
  if (!event || event.department_id !== departmentId) notFound();

  const entries = event.entries.map((entry) => ({
    id: entry.id, type: entry.type, status: entry.status, amount: Number(entry.amount),
    supplierName: entry.supplier_name, documentType: entry.document_type_raw,
    documentNumber: entry.document_number, category: entry.category,
    issueDate: entry.issue_date, issueTime: entry.issue_time, imageUrl: entry.image_url,
    itemBreakdown: entry.item_breakdown, formPayload: entry.form_payload_json,
    rejectionReason: entry.rejection_reason, resubmissionExplanation: entry.resubmission_explanation,
    createdAt: entry.created_at, voidReason: entry.void_reason,
    voidedBy: entry.voided_by, voidedAt: entry.voided_at, voidedByName: entry.voidedByName,
  }));
  const categories = [...new Set(entries.map((entry) => entry.documentType).filter((name): name is string => Boolean(name)))].map((name) => ({ name }));

  return (
    <div className="mx-auto w-full max-w-4xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <ExpensesSection entries={entries} categories={categories} isArchived={event.status === "archived"}
        canMutate={false} mobileLayout backHref={`/admin/departments/${departmentId}/reports/${eventId}`} />
    </div>
  );
}
