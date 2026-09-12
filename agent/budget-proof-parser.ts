// Budget-proof OCR/parsing — Google Gemini vision call (direct, not OpenRouter) with zod-validated output.
// Server-only (imported by /api/proofs). Extracts the BUDGET AMOUNT shown on a funding
// letter / approved budget document. A failed parse throws; it never touches the DB.

import { geminiChatCompletion, GEMINI_MODEL, GeminiError } from "@/lib/gemini";
import {
  budgetProofResponseSchema,
  type BudgetProofParseOutcome,
  type BudgetProofParseResult,
} from "@/agent/types";

export const SYSTEM_PROMPT = `You are a document OCR assistant for a Philippine department-council liquidation system. Extract the BUDGET AMOUNT and identifying fields from the budget proof document image (a funding letter, approved budget proposal, resolution, or similar) and return ONLY a JSON object.

This document proves how much money a department is authorized to spend on an event. The key field is the total budget amount the document grants or approves.

Rules:
1. supplier_name: the name of the approving entity or institution that issued the document (e.g. "Office of the Student Affairs", "CCS Department Council", "University Budget Office"). If none is printed, use the addressee organization.
2. document_number: the document reference number if printed (e.g. "Letter No. 2026-014", "Resolution No. 03"). If none exists, return "" (empty string) — never null and never a made-up number.
3. issue_date: the document date in YYYY-MM-DD format; "" if none printed.
4. amount: THE TOTAL BUDGET AMOUNT the document approves or allocates, in Philippine Pesos — the headline figure (e.g. "Php 35,000", "₱35,000.00", "Thirty-five thousand pesos"). Numeric, no currency symbol, no thousands separators. NEVER use any other figure on the page (quotations, VT amounts, incidental totals).
5. classification: ALWAYS classify the image. outcome "valid": you can clearly read the budget amount AND the approving entity — printed or handwritten. outcome "multiple": the image contains MORE THAN ONE distinct document — even if the second one is partially visible or cropped at the edge; never attempt extraction of either, return "multiple". outcome "borderline": a single document but blurry, cropped, or low-contrast so key fields are unreadable. outcome "invalid": blank page, illegible scribble, or nothing traceable (e.g. a photo of a person or object). When in doubt between "multiple" and "borderline": two or more separate documents → "multiple", otherwise "borderline" — never "invalid". A hand holding the document does NOT count as a second document.
6. NEVER guess: if you cannot clearly read the budget amount, return amount null and outcome "borderline" — never invent or reconstruct a number. classification.reason: one short phrase justifying the outcome.

Return exactly: {"classification": {"outcome": "valid" | "multiple" | "borderline" | "invalid", "reason": "..."}, "supplier_name": "..." or null, "document_number": "..." or null, "issue_date": "YYYY-MM-DD" or null, "amount": 0.00 or null}`;

// Retry budget ONLY for fast schema-mismatch re-parses (same reasoning as receipt-parser:
// transport/timeout errors are never retried in-request — the Hobby 10s ceiling can't
// absorb a re-issued timed-out Gemini call).
const ATTEMPTS = 3;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

/** True when a Gemini transport call gave up (timeout abort or fetch failure). */
function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "TimeoutError") return true;
  if (err.name === "AbortError") return true;
  return /aborted|timeout|timed ?out/i.test(err.message);
}

/**
 * Parses a budget proof image (base64 data URL) into a discriminated outcome.
 * "valid" carries the strict proof (amount + entity guaranteed by the schema).
 * "borderline"/"invalid"/"multiple" short-circuit with the model's reason — no row, no retry.
 * Retries up to 3 times only on malformed JSON / schema mismatches, per library-docs.
 * Transport/timeout failures throw immediately (the /api/proofs route is the retry lane).
 * @throws GeminiError/timeout on transport failure, Error on persistent bad extraction.
 */
export async function parseBudgetProof(dataUrl: string): Promise<BudgetProofParseOutcome> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: [{ type: "image_url", image_url: { url: dataUrl } }],
    },
  ];

  let lastDetail = "no response";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    try {
      const { text } = await geminiChatCompletion({
        model: GEMINI_MODEL,
        messages,
        responseFormat: { type: "json_object" },
      });
      const result = budgetProofResponseSchema.safeParse(JSON.parse(stripCodeFences(text)));
      if (result.success) {
        console.info(`[agent/budget-proof-parser] parsed in ${Date.now() - startedAt}ms (${GEMINI_MODEL})`);
        const d = result.data;
        if (d.classification.outcome === "valid") {
          return {
            outcome: "valid" as const,
            proof: {
              supplier_name: d.supplier_name ?? "",
              document_number: d.document_number ?? "",
              issue_date: d.issue_date ?? "",
              amount: d.amount ?? 0,
            } satisfies BudgetProofParseResult,
          };
        }
        return { outcome: d.classification.outcome, reason: d.classification.reason };
      }
      lastDetail = `schema mismatch: ${result.error.issues[0]?.path.join(".") ?? "?"} — ${result.error.issues[0]?.message ?? "invalid"}`;
    } catch (err) {
      if (err instanceof GeminiError || isTimeoutError(err)) throw err;
      lastDetail = err instanceof Error ? err.message : String(err);
    }
    console.warn(`[agent/budget-proof-parser] attempt ${attempt}/${ATTEMPTS} failed (${Date.now() - startedAt}ms): ${lastDetail}`);
  }

  throw new Error(`Could not extract budget proof data: ${lastDetail}`);
}