import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { formatPHP } from "@/lib/format";
import { getBudgetProofsByEvent, type BudgetProof } from "@/lib/queries/budget-proofs";

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

  // Group by month, newest month first (proofs come back newest-first).
  const byMonth = new Map<string, BudgetProof[]>();
  for (const p of proofs) {
    const month = new Date(p.uploaded_at).toLocaleDateString("en-PH", {
      month: "long",
      year: "numeric",
    });
    const list = byMonth.get(month);
    if (list) list.push(p);
    else byMonth.set(month, [p]);
  }

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
        {proofs.length === 0 ? (
          <p className="mt-16 text-center text-sm text-text-muted">
            No budget history yet.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {[...byMonth.entries()].map(([month, list]) => (
              <section key={month}>
                <h2 className="mb-2 text-xs font-medium tracking-wide text-text-muted">
                  {month}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {list.map((p) => {
                    const submitted = new Date(p.uploaded_at).toLocaleDateString(
                      "en-PH",
                      { year: "numeric", month: "short", day: "numeric" },
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-[5px] bg-surface px-4 py-3.5"
                        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold tabular-nums text-text-primary">
                            {formatPHP(p.claimed_amount)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            Submitted on {submitted}
                          </p>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-text-muted"
                          aria-hidden
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}