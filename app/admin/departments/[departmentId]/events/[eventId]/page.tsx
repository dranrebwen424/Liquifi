import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { computeSpendingBreakdown } from "@/lib/spending-breakdown";
import { LockedBanner } from "@/components/events/LockedBanner";
import { BudgetSummary } from "@/components/events/BudgetSummary";
import { SpendingBreakdownCard } from "@/components/events/SpendingBreakdownCard";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { ExpensesSection } from "@/components/entries/ExpensesSection";
import { EventPageEntrance } from "@/components/events/EventPageEntrance";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ departmentId: string; eventId: string }>;
};

// Admin read-only view of an event dashboard — same components as the
// treasurer page, but every mutating control is omitted (readOnly/canMutate=false).
export default async function AdminEventPage({ params }: Props) {
  const { departmentId, eventId } = await params;
  await requireRole("admin");

  const event = await getEventDashboard(eventId);
  if (!event) notFound();

  // URL consistency guard: the event must belong to the department in the path
  if (event.department_id !== departmentId) notFound();

  const isArchived = event.status === "archived";
  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const categories = [
    ...new Set(event.entries.map((e) => e.document_type_raw).filter(Boolean)),
  ].map((name) => ({ name: name! }));

  const breakdown = computeSpendingBreakdown(event.entries);

  return (
    <EventPageEntrance>
    <div className="flex flex-col pb-16">
      {/* Back link */}
      <Link
        href={`/admin/departments/${departmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to department
      </Link>

      {/* Header — title truncates instead of wrapping on phones */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 truncate text-lg font-semibold text-text-primary sm:text-2xl md:text-[28px]">
            {event.name}
          </h1>
          <EventStatusBadge status={event.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-text-muted sm:text-xs">
          Created {createdDate}
          {event.created_by_name && event.created_by_name !== "Unknown" && (
            <> · by {event.created_by_name}</>
          )}
        </p>
      </div>

      {/* Locked / Archived banner */}
      {(event.is_locked || isArchived) && (
        <div className="mt-5">
          <LockedBanner isLocked={event.is_locked} isArchived={isArchived} />
        </div>
      )}

      {/* Two-column: Dark hero + Spending breakdown */}
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:gap-4">
        <BudgetSummary
          budgetTotal={event.budget_total}
          totalSpent={event.total_spent}
          eventId={eventId}
          canMutate={false}
          isArchived={isArchived}
          isLocked={event.is_locked}
          readOnly
          className="lg:w-3/5"
        />

        <SpendingBreakdownCard
          categories={breakdown}
          eventId={eventId}
          readOnly
          className="hidden lg:flex lg:w-2/5"
        />
      </div>

      {/* Expenses section — read-only (no void/resubmit/discard) */}
      <div className="mt-8 border-t border-border-light pt-6">
        <ExpensesSection
          entries={event.entries.map((e) => ({
            id: e.id,
            type: e.type,
            status: e.status,
            amount: Number(e.amount),
            description: e.document_type_raw,
            supplierName: e.supplier_name,
            documentType: e.document_type_raw,
            documentNumber: e.document_number,
            category: e.category ?? null,
            issueDate: e.issue_date ?? null,
            issueTime: e.issue_time ?? null,
            imageUrl: e.image_url ?? null,
            itemBreakdown: e.item_breakdown ?? null,
            formPayload: e.form_payload_json ?? null,
            rejectionReason: e.rejection_reason,
            resubmissionExplanation: e.resubmission_explanation,
            createdAt: e.created_at,
            voidReason: e.void_reason,
            voidedBy: e.voided_by,
            voidedAt: e.voided_at ?? null,
            voidedByName: e.voidedByName ?? null,
          }))}
          categories={categories}
          isArchived={isArchived}
          canMutate={false}
        />
      </div>
    </div>
    </EventPageEntrance>
  );
}
