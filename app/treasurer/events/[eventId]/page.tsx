import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { getEventDashboard, type EntryForDashboard } from "@/lib/queries/events";
import { LockedBanner } from "@/components/events/LockedBanner";
import { BudgetSummary } from "@/components/events/BudgetSummary";
import { SpendingBreakdownCard } from "@/components/events/SpendingBreakdownCard";
import { EventStatusBadge } from "@/components/ui/StatusBadge";
import { EventDashboardActions } from "@/components/events/EventDashboardActions";
import { ExpensesSection } from "@/components/entries/ExpensesSection";

type Props = {
  params: Promise<{ eventId: string }>;
};

// ponytail: mock data for SpendingBreakdown — replace with real data later
const MOCK_CATEGORIES = [
  { name: "Transportation", amount: 12500, percentage: 35 },
  { name: "Meals", amount: 8900, percentage: 25 },
  { name: "Supplies", amount: 6400, percentage: 18 },
  { name: "Printing", amount: 4300, percentage: 12 },
  { name: "Rental", amount: 3600, percentage: 10 },
];

// ponytail: mock entries for visual testing — replace with real data later
const MOCK_ENTRIES: EntryForDashboard[] = [
  {
    id: "mock-1",
    type: "receipt",
    status: "deducted",
    amount: 1250,
    supplier_name: "Jollibee Foods Corp.",
    document_type_raw: "Official Receipt",
    document_number: "OR-2024-001234",
    issue_date: "2026-01-15",
    issue_time: "14:30",
    category: "Food & Drink",
    item_breakdown: [
      { description: "Chickenjoy Meal", quantity: 2, unit_price: 175, line_amount: 350 },
      { description: "Jolly Spaghetti", quantity: 1, unit_price: 65, line_amount: 65 },
      { description: "Large Coke", quantity: 2, unit_price: 55, line_amount: 110 },
    ],
    created_at: "2026-01-15T14:30:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
  {
    id: "mock-2",
    type: "manual",
    status: "pending_approval",
    amount: 850,
    supplier_name: null,
    document_type_raw: "Transportation",
    document_number: null,
    issue_date: null,
    issue_time: null,
    category: null,
    item_breakdown: null,
    created_at: "2026-01-16T09:00:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
  {
    id: "mock-3",
    type: "receipt",
    status: "approved",
    amount: 3500,
    supplier_name: "SM Supermalls",
    document_type_raw: "Sales Invoice",
    document_number: "SI-2024-005678",
    issue_date: "2026-01-18",
    issue_time: "10:15",
    category: "Supplies",
    item_breakdown: [
      { description: "Bond Paper (ream)", quantity: 5, unit_price: 180, line_amount: 900 },
      { description: "Ballpoint Pens (box)", quantity: 3, unit_price: 120, line_amount: 360 },
      { description: "Tape", quantity: 4, unit_price: 45, line_amount: 180 },
    ],
    created_at: "2026-01-18T10:15:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
  {
    id: "mock-4",
    type: "receipt",
    status: "ai_parsed",
    amount: 450,
    supplier_name: "McDo Delivery",
    document_type_raw: "Official Receipt",
    document_number: "OR-2024-009999",
    issue_date: "2026-01-20",
    issue_time: "12:00",
    category: "Food & Drink",
    item_breakdown: [
      { description: "Big Mac Meal", quantity: 2, unit_price: 180, line_amount: 360 },
    ],
    created_at: "2026-01-20T12:00:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
  {
    id: "mock-5",
    type: "manual",
    status: "voided",
    amount: 150,
    supplier_name: null,
    document_type_raw: "Supplies",
    document_number: null,
    issue_date: null,
    issue_time: null,
    category: null,
    item_breakdown: null,
    created_at: "2026-01-21T08:00:00Z",
    void_reason: "Duplicate entry — merged with mock-1",
    voided_by: "Juan Dela Cruz",
    voided_at: "2026-01-22T10:30:00Z",
  },
  {
    id: "mock-6",
    type: "receipt",
    status: "deducted",
    amount: 12000,
    supplier_name: "Philippine Airlines",
    document_type_raw: "E-Ticket Receipt",
    document_number: "ET-2024-004321",
    issue_date: "2026-01-25",
    issue_time: "08:00",
    category: "Transportation",
    item_breakdown: [
      { description: "Round-trip fare (Cebu)", quantity: 2, unit_price: 5500, line_amount: 11000 },
      { description: "Seat selection", quantity: 2, unit_price: 500, line_amount: 1000 },
    ],
    created_at: "2026-01-25T08:00:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
  {
    id: "mock-7",
    type: "manual",
    status: "rejected",
    amount: 2200,
    supplier_name: null,
    document_type_raw: "Meals",
    document_number: null,
    issue_date: null,
    issue_time: null,
    category: null,
    item_breakdown: null,
    created_at: "2026-01-26T15:00:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
  {
    id: "mock-8",
    type: "receipt",
    status: "deducted",
    amount: 680,
    supplier_name: "National Book Store",
    document_type_raw: "Official Receipt",
    document_number: "OR-2024-007777",
    issue_date: "2026-01-28",
    issue_time: "16:45",
    category: "Supplies",
    item_breakdown: [
      { description: "Notebook", quantity: 5, unit_price: 45, line_amount: 225 },
      { description: "Highlighters (set)", quantity: 2, unit_price: 85, line_amount: 170 },
    ],
    created_at: "2026-01-28T16:45:00Z",
    void_reason: null,
    voided_by: null,
    voided_at: null,
  },
];

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

  const createdDate = new Date(event.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // ponytail: derive categories from real entries, fallback to mock
  const uniqueCategories = [
    ...new Set(event.entries.map((e) => e.document_type_raw).filter(Boolean)),
  ].map((name) => ({ name: name! }));

  const categoriesToShow =
    uniqueCategories.length > 0 ? uniqueCategories : MOCK_CATEGORIES;

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

        {/* Spending Breakdown — desktop only */}
        <SpendingBreakdownCard
          categories={MOCK_CATEGORIES}
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
        entries={(event.entries.length > 0 ? event.entries : MOCK_ENTRIES).map((e) => ({
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
          createdAt: e.created_at,
          voidReason: e.void_reason,
          voidedBy: e.voided_by,
          voidedAt: e.voided_at ?? null,
        }))}
        categories={categoriesToShow}
        isArchived={isArchived}
      />
    </div>
  );
}
