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
import { ExpensesSection } from "@/components/entries/ExpensesSection";
import { FadeIn } from "@/components/ui/FadeIn";
import { ViewReportPill } from "@/components/adviser/ViewReportPill";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
};

// Adviser read-only view of an event dashboard — same layout as the
// treasurer page, but every mutating control is omitted (readOnly/canMutate=false)
// and the Archive slot becomes a "View Report" pill (advisers don't archive).
export default async function AdviserEventPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("adviser");

  const event = await getEventDashboard(eventId);
  if (!event) notFound();

  // Cross-department guard (belt-and-suspenders on top of RLS)
  if (user.departmentId && event.department_id !== user.departmentId) {
    notFound();
  }

  const isArchived = event.status === "archived";

  // Only render "View Report" when the event actually has a report —
  // otherwise it would land on the report page's 404 (no report yet).
  const latestReport = await getLatestReportByEvent(eventId);

  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const categories = [
    ...new Set(event.entries.map((e) => e.document_type_raw).filter(Boolean)),
  ].map((name) => ({ name: name! }));

  const breakdown = computeSpendingBreakdown(event.entries);

  // View Report pill — links when a report exists; otherwise a muted button
  // that pops up a "No report yet" notice (the report page would 404 otherwise).
  const hasReport = !!latestReport;

  return (
    <div className="flex flex-col pb-16">
      {/* ── MOBILE LAYOUT (matches treasurer event page) ── */}
      <div className="lg:hidden px-3 pt-6">
        {/* Back arrow + Event name + View Report (all in one row) */}
        <FadeIn>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Link
              href="/adviser/home"
              className="mt-0.5 inline-flex shrink-0 items-center justify-center"
              aria-label="Back to events"
            >
              <ArrowLeft className="h-5 w-5 text-text-primary" />
            </Link>
            <div className="min-w-0">
              <h1 className="min-w-0 truncate text-[20px] font-semibold leading-tight text-text-primary">
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

          <ViewReportPill href={`/adviser/reports/${eventId}`} hasReport={hasReport} />
        </div>
        </FadeIn>

        {/* Dark budget card — no creator info inside */}
        <FadeIn delay={150}>
        <BudgetSummary
          budgetTotal={event.budget_total}
          totalSpent={event.total_spent}
          eventId={eventId}
          canMutate={false}
          isArchived={isArchived}
          isLocked={event.is_locked}
          budgetLocked={event.budget_locked}
          readOnly
          className="mt-4"
          mobileOnly
        />
        </FadeIn>

        {/* Locked / Archived banner */}
        {(event.is_locked || isArchived) && (
          <FadeIn delay={300}>
          <div className="mt-4">
            <LockedBanner isLocked={event.is_locked} isArchived={isArchived} />
          </div>
          </FadeIn>
        )}

        {/* Expenses section — separated by white space only */}
        <FadeIn delay={event.is_locked || isArchived ? 510 : 450}>
        <div className="mt-8">
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
            mobileLayout
          />
        </div>
        </FadeIn>
      </div>

      {/* ── DESKTOP LAYOUT (matches treasurer event page) ── */}
      <div className="hidden lg:block">
        {/* Back link */}
        <FadeIn>
          <Link
            href="/adviser/home"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </FadeIn>

        {/* Header — title left, View Report far right */}
        <FadeIn delay={100}>
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

          <ViewReportPill href={`/adviser/reports/${eventId}`} hasReport={hasReport} />
        </div>
        </FadeIn>

        {/* Locked / Archived banner */}
        {(event.is_locked || isArchived) && (
          <FadeIn delay={200}>
          <div className="mt-5">
            <LockedBanner isLocked={event.is_locked} isArchived={isArchived} />
          </div>
          </FadeIn>
        )}

        {/* Two-column: Dark hero + Spending breakdown */}
        <FadeIn delay={event.is_locked || isArchived ? 360 : 300}>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:gap-4">
          <BudgetSummary
            budgetTotal={event.budget_total}
            totalSpent={event.total_spent}
            eventId={eventId}
            canMutate={false}
            isArchived={isArchived}
            isLocked={event.is_locked}
            budgetLocked={event.budget_locked}
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
        </FadeIn>

        {/* Expenses section */}
        <FadeIn delay={event.is_locked || isArchived ? 460 : 400}>
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
        </FadeIn>
      </div>
    </div>
  );
}
