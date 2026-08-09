import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { getLatestReportByEvent } from "@/lib/queries/reports";
import { computeSpendingBreakdown } from "@/lib/spending-breakdown";
import { LockedBanner } from "@/components/events/LockedBanner";
import { BudgetSummary } from "@/components/events/BudgetSummary";
import { SpendingBreakdownCard } from "@/components/events/SpendingBreakdownCard";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { EventDashboardActions } from "@/components/events/EventDashboardActions";
import { ArchiveEventButton } from "@/components/events/ArchiveEventModal";
import { ExpensesSection } from "@/components/entries/ExpensesSection";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function EventDashboardPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");

  const event = await getEventDashboard(eventId);

  if (!event) {
    notFound();
  }

  // Cross-department guard (belt-and-suspenders on top of RLS)
  if (user.departmentId && event.department_id !== user.departmentId) {
    notFound();
  }

  const isArchived = event.status === "archived";
  const canMutate = !event.is_locked && !isArchived;

  // Archive gate: only reachable once the latest report is approved, the
  // event is not yet archived, and no unresolved overspend remains.
  const latestReport = await getLatestReportByEvent(eventId);
  const canArchive =
    latestReport?.status === "approved" &&
    !isArchived &&
    !event.has_unresolved_overspend;

  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Category options for the expense filter — derived from real entries
  const categories = [
    ...new Set(event.entries.map((e) => e.document_type_raw).filter(Boolean)),
  ].map((name) => ({ name: name! }));

  const breakdown = computeSpendingBreakdown(event.entries);

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Back link */}
      <Link
        href="/treasurer/home"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
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
          <p className="mt-1 text-xs text-text-muted">
            Created {createdDate}
            {event.created_by_name && event.created_by_name !== "Unknown" && (
              <> · by {event.created_by_name}</>
            )}
          </p>
        </div>

        <ArchiveEventButton
          eventId={eventId}
          canArchive={canArchive}
          isArchived={isArchived}
        />
      </div>

      {/* Locked / Archived banner */}
      <LockedBanner isLocked={event.is_locked} isArchived={isArchived} />

      {/* Two-column: Dark hero + Spending breakdown */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-4">
        {/* Dark hero: Budget — 60% on desktop */}
        <BudgetSummary
          budgetTotal={event.budget_total}
          totalSpent={event.total_spent}
          eventId={eventId}
          canMutate={canMutate}
          isArchived={isArchived}
          isLocked={event.is_locked}
          className="lg:w-3/5"
        />

        {/* Spending Breakdown — desktop only, real data (empty state until entries are deducted) */}
        <SpendingBreakdownCard
          categories={breakdown}
          eventId={eventId}
          className="hidden lg:flex lg:w-2/5"
        />
      </div>

      {/* Mobile-only action buttons */}
      <div className="lg:hidden">
        <EventDashboardActions
          eventId={eventId}
          canMutate={canMutate}
          isArchived={isArchived}
          isLocked={event.is_locked}
        />
      </div>

      {/* Expenses section with filters */}
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
        canMutate={canMutate}
      />
    </div>
  );
}
