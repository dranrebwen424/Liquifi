"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { BudgetProofDetailModal } from "@/components/events/BudgetProofDetailModal";
import type { BudgetProof } from "@/lib/queries/budget-proofs";

const PILL: Record<
  BudgetProof["verification_status"],
  { label: string; cls: string }
> = {
  matched: { label: "Verified", cls: "bg-success-light text-success-foreground" },
  mismatch: { label: "Mismatch", cls: "bg-warning-light text-warning-foreground" },
  pending: { label: "Pending", cls: "bg-surface-secondary text-text-muted" },
};

function proofDetail(p: BudgetProof, submitted: string) {
  if (p.verification_status === "matched" && p.resulting_budget_total != null) {
    return `Verified · new total ${formatPHP(p.resulting_budget_total)}`;
  }
  if (p.verification_status === "mismatch" && p.ai_extracted_amount != null) {
    return `Document shows ${formatPHP(p.ai_extracted_amount)}`;
  }
  return `Submitted on ${submitted}`;
}

/** Tappable budget-history cards, grouped by month (newest month first) +
 *  tap-through detail sheet. */
export function BudgetHistoryList({ proofs }: { proofs: BudgetProof[] }) {
  const [selected, setSelected] = useState<BudgetProof | null>(null);

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
    <>
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
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className="flex items-center justify-between gap-3 rounded-[5px] bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary"
                      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-text-muted">
                          {p.type === "initial"
                            ? "Initial budget"
                            : "Budget increase"}
                        </p>
                        <p className="text-[15px] font-semibold tabular-nums text-text-primary">
                          {formatPHP(p.claimed_amount)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          {proofDetail(p, submitted)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PILL[p.verification_status].cls}`}
                        >
                          {PILL[p.verification_status].label}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-text-muted"
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <BudgetProofDetailModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        proof={selected}
      />
    </>
  );
}