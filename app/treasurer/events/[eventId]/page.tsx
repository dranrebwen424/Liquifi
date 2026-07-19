import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard } from "@/lib/queries/events";
import { LockedBanner } from "@/components/events/LockedBanner";
import { BudgetSummary } from "@/components/events/BudgetSummary";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { EntryList } from "@/components/entries/EntryList";
import { EventDashboardActions } from "@/components/events/EventDashboardActions";

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

  return (
    <div className="flex flex-col gap-6">
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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
            {event.name}
          </h1>
          <EventStatusBadge status={event.status} />
        </div>
      </div>

      <LockedBanner isLocked={event.is_locked} isArchived={isArchived} />

      <BudgetSummary
        budgetTotal={event.budget_total}
        totalSpent={event.total_spent}
      />

      {/* Actions */}
      <EventDashboardActions
        eventId={eventId}
        canMutate={canMutate}
        isArchived={isArchived}
        isLocked={event.is_locked}
      />

      {/* Entry list */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-text-primary">
          Entries
        </h2>
        <EntryList
          entries={event.entries.map((e) => ({
            id: e.id,
            type: e.type,
            status: e.status,
            amount: Number(e.amount),
            description: e.document_type_raw,
            supplierName: e.supplier_name,
            documentType: e.document_type_raw,
            documentNumber: e.document_number,
            voidReason: e.void_reason,
            voidedBy: e.voided_by,
          }))}
          isArchived={isArchived}
        />
      </div>
    </div>
  );
}
