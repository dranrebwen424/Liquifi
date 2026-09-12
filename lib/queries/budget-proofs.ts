import { cache } from "react";
import { createInsforgeServer } from "@/lib/insforge-server";

export type BudgetProof = {
  id: string;
  uploaded_at: string;
  type: "initial" | "increase";
  claimed_amount: number;
  ai_extracted_amount: number | null;
  verification_status: "pending" | "matched" | "mismatch";
  resulting_budget_total: number | null;
  proof_url: string | null;
};

/** All budget proofs for one event, newest first. */
// ponytail: React cache() dedupes identical calls within one render pass (same
// rationale as lib/queries/events.ts). No uploader-name join — the UI doesn't
// show it; add one only if a card needs attribution.
export const getBudgetProofsByEvent = cache(async function getBudgetProofsByEvent(
  eventId: string,
  departmentId: string,
): Promise<BudgetProof[]> {
  const insforge = await createInsforgeServer();

  const { data, error } = await insforge.database
    .from("budget_proofs")
    .select(
      "id, uploaded_at, type, claimed_amount, ai_extracted_amount, verification_status, resulting_budget_total, proof_url",
    )
    .eq("event_id", eventId)
    .eq("department_id", departmentId)
    .order("uploaded_at", { ascending: false });

  if (error || !data) {
    console.error("[queries/budget-proofs] fetch failed:", error);
    return [];
  }

  return data.map((p) => ({
    ...p,
    claimed_amount: Number(p.claimed_amount),
    ai_extracted_amount: p.ai_extracted_amount != null ? Number(p.ai_extracted_amount) : null,
    resulting_budget_total: p.resulting_budget_total != null ? Number(p.resulting_budget_total) : null,
  }));
});