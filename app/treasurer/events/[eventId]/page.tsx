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
import { EventPageEntrance } from "@/components/events/EventPageEntrance";

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
    <EventPageEntrance>
    <div className="flex flex-col pb-16">
      {/* ── MOBILE LAYOUT (matches Figma) ── */}
      <div className="lg:hidden px-4">
        {/* Back arrow + Event name + Archive Report (all in one row) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Link
              href="/treasurer/home"
              className="mt-0.5 inline-flex shrink-0 items-center justify-center"
              aria-label="Back to events"
            >
              <ArrowLeft className="h-[18px] w-[18px] text-text-primary" />
            </Link>
            <div className="min-w-0">
              <h1 className="min-w-0 truncate text-[17px] font-semibold leading-tight text-text-primary">
                {event.name}
              </h1>
              <p className="mt-0.5 text-[10px] leading-snug text-text-muted">
                {event.created_by_name && event.created_by_name !== "Unknown" && (
                  <>By: {event.created_by_name}</>
                )}
              </p>
              <p className="text-[10px] leading-snug text-text-muted">
                Created {createdDate}
              </p>
            </div>
          </div>

          <ArchiveEventButton
            eventId={eventId}
            canArchive={canArchive}
            isArchived={isArchived}
            compact
          />
        </div>

        {/* Dark budget card — no creator info inside */}
        <BudgetSummary
          budgetTotal={event.budget_total}
          totalSpent={event.total_spent}
          eventId={eventId}
          canMutate={canMutate}
          isArchived={isArchived}
          isLocked={event.is_locked}
          className="mt-4"
          mobileOnly
        />

        {/* Action buttons row — Log Entry + View Report */}
        <div className="mt-3.5">
          <EventDashboardActions
            eventId={eventId}
            canMutate={canMutate}
            isArchived={isArchived}
            isLocked={event.is_locked}
          />
        </div>

        {/* Locked / Archived banner */}
        {(event.is_locked || isArchived) && (
          <div className="mt-4">
            <LockedBanner isLocked={event.is_locked} isArchived={isArchived} />
          </div>
        )}

        {/* Expenses section — visual separator */}
        <div className="mt-7 border-t border-border-light pt-5">
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
            mobileLayout
          />
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (unchanged) ── */}
      <div className="hidden lg:block">
        {/* Back link */}
        <Link
          href="/treasurer/home"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>

        {/* Header — title left, Archive far right */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
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

          <ArchiveEventButton
            eventId={eventId}
            canArchive={canArchive}
            isArchived={isArchived}
          />
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
            canMutate={canMutate}
            isArchived={isArchived}
            isLocked={event.is_locked}
            className="lg:w-3/5"
          />

          <SpendingBreakdownCard
            categories={breakdown}
            eventId={eventId}
            className="hidden lg:flex lg:w-2/5"
          />
        </div>

        {/* Mobile-only action buttons */}
        <div className="mt-3 lg:hidden">
          <EventDashboardActions
            eventId={eventId}
            canMutate={canMutate}
            isArchived={isArchived}
            isLocked={event.is_locked}
          />
        </div>

        {/* Expenses section */}
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
            canMutate={canMutate}
          />
        </div>
      </div>
    </div>
    </EventPageEntrance>
  );
}
