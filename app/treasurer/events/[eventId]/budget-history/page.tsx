import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getBudgetProofsByEvent } from "@/lib/queries/budget-proofs";
import { BudgetHistoryList } from "@/components/events/BudgetHistoryList";

type Props = {
  params: Promise<{ eventId: string }>;
};

// ponytail: no pagination — budgets change a handful of times per event, and
// the proof table is add-only. Paginate only if events ever accumulate 100s.
export default async function BudgetHistoryPage({ params }: Props) {
  const { eventId } = await params;
  const user = await requireRole("treasurer");

  // Event row: cross-dept guard + department for the proofs query.
  // Minimal select — no entries needed here.
  const insforge = await createInsforgeServer();
  const { data: event, error } = await insforge.database
    .from("events")
    .select("id, name, department_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) notFound();
  if (user.departmentId && event.department_id !== user.departmentId) notFound();

  const proofs = await getBudgetProofsByEvent(eventId, event.department_id);

  return (
    <div className="pb-16">
      {/* Header — back arrow + centered title */}
      <header className="relative flex items-center px-3 pt-6">
        <Link
          href={`/treasurer/events/${eventId}`}
          className="inline-flex shrink-0 items-center justify-center"
          aria-label="Back to event"
        >
          <ArrowLeft className="h-5 w-5 text-text-primary" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-text-primary">
          History
        </h1>
        <span className="w-5" aria-hidden />
      </header>

      <main className="px-3 pt-5">
        <BudgetHistoryList proofs={proofs} />
      </main>
    </div>
  );
}