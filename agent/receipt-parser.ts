// Receipt OCR/parsing — Google Gemini vision call (direct, not OpenRouter) with zod-validated output.
// Server-only (imported by API routes). A failed parse throws; it never touches the DB.

import { geminiChatCompletion, GEMINI_MODEL, GeminiError } from "@/lib/gemini";
import {
  receiptResponseSchema,
  normalizeCategory,
  normalizeExpenseCategory,
  type ParseOutcome,
  type ReceiptParseResult,
} from "@/agent/types";

export const SYSTEM_PROMPT = `You are a receipt OCR assistant for a Philippine department-council liquidation system. Extract data from the receipt image and return ONLY a JSON object.

Rules:
1. document_type_raw: the VERBATIM printed document label on the receipt (e.g. "Official Receipt", "Sales Invoice", "Cash Sales Invoice", "Delivery Receipt", "Acknowledgement Receipt", "Collection Receipt"). Never invent or force it into an enum.
2. document_type_category: a system-normalized snake_case value derived from the label, one of: official_receipt, sales_invoice, cash_sales_invoice, delivery_receipt, acknowledgement_receipt, collection_receipt, other.
3. document_number: Rule A — the number printed next to the label that matches document_type_raw (e.g. "OR No.", "SI No.", "CR No."). Never use incidental POS metadata like transaction/terminal/ref numbers when a label-tied number exists. If NO label-tied number exists, return "" (empty string) — never null and never a made-up number.
4. issue_date: in YYYY-MM-DD format. issue_time (optional, HH:MM 24h): only if the receipt prints a separate time; never combine date and time into one field.
5. supplier_name: the business name (e.g. "SM Supermarket", "National Book Store Inc.").
6. amount: Rule B — the FINAL AMOUNT DUE (Grand Total / Total Amount Due / Amount Paid), never a sub-total. Numeric, no currency symbol, no thousands separators.
7. item_breakdown: REQUIRED array of { description, qty, unitPrice, lineAmount } for every line item. unitPrice and lineAmount are numbers. If the receipt omits a price, set it to the computed value or 0.
8. classification: ALWAYS classify the image. outcome "valid": you can clearly read a vendor AND an amount — printed or handwritten, any document type, even without a number. outcome "borderline": the image is clearly a document but blurry, cropped, or low-contrast, so you cannot read key fields. outcome "invalid": blank page, illegible scribble, or nothing traceable — no vendor, no amount, no number (e.g. a photo of a person or object). When in doubt, choose "borderline" — never "invalid".
9. NEVER guess: if you cannot clearly read a field, return null for it — never infer or reconstruct numbers, dates, or amounts from context. A readable vendor and amount are what make an image "valid"; if either is unreadable, the outcome must be "borderline". classification.reason: one short phrase justifying the outcome.
10. category: the expense category inferred from the receipt's supplier and line items — exactly one of: transportation, meals, honorarium, supplies, printing, rental, others. Examples: bookstore/office items → supplies; restaurant/food → meals; jeepney/GRAB/van fare → transportation; printing shop → printing; venue/equipment rental → rental; speaker fee → honorarium. When in doubt, choose "others" — never invent a new value. Must be non-null whenever outcome is "valid".

Only issue_time may be null; every other missing field is "" (empty string) when outcome is "valid", or null when the outcome is not "valid".

Return exactly: {"classification": {"outcome": "valid" | "borderline" | "invalid", "reason": "..."}, "document_type_raw": "..." or null, "document_type_category": "..." or null, "category": "transportation" | "meals" | "honorarium" | "supplies" | "printing" | "rental" | "others" or null, "document_number": "..." or null, "issue_date": "YYYY-MM-DD" or null, "issue_time": "HH:MM" or null, "supplier_name": "..." or null, "amount": 0.00 or null, "item_breakdown": [{"description": "...", "qty": 1, "unitPrice": 0.00, "lineAmount": 0.00}] or null}`;

const ATTEMPTS = 3;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Parses a receipt image (base64 data URL) into a discriminated outcome.
 * "valid" carries the strict receipt (supplier + amount + items guaranteed by the schema).
 * "borderline"/"invalid" short-circuit with the model's reason — no row, no retry.
 * Retries up to 3 times only on malformed JSON / schema mismatches, per library-docs.
 * @throws GeminiError on transport failure, Error on persistent bad extraction.
 */
export async function parseReceipt(dataUrl: string): Promise<ParseOutcome> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: [
        {
          type: "image_url",
          image_url: { url: dataUrl },
        },
      ],
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
      const result = receiptResponseSchema.safeParse(JSON.parse(stripCodeFences(text)));
      if (result.success) {
        console.info(`[agent/receipt-parser] parsed in ${Date.now() - startedAt}ms (${GEMINI_MODEL})`);
        const d = result.data;
        if (d.classification.outcome === "valid") {
          return {
            outcome: "valid" as const,
            receipt: {
              document_type_raw: d.document_type_raw ?? "",
              document_type_category: normalizeCategory(d.document_type_category ?? ""),
              category: normalizeExpenseCategory(d.category ?? ""),
              document_number: d.document_number ?? "",
              issue_date: d.issue_date ?? "",
              issue_time: d.issue_time ?? null,
              supplier_name: d.supplier_name ?? "",
              amount: d.amount ?? 0,
              item_breakdown: d.item_breakdown ?? [],
            },
          };
        }
        return { outcome: d.classification.outcome, reason: d.classification.reason };
      }
      lastDetail = `schema mismatch: ${result.error.issues[0]?.path.join(".") ?? "?"} — ${result.error.issues[0]?.message ?? "invalid"}`;
    } catch (err) {
      if (err instanceof GeminiError) throw err; // transport/auth — no retry for a dead key
      lastDetail = err instanceof Error ? err.message : String(err);
    }
    console.warn(`[agent/receipt-parser] attempt ${attempt}/${ATTEMPTS} failed (${Date.now() - startedAt}ms): ${lastDetail}`);
  }

  throw new Error(`Could not extract receipt data: ${lastDetail}`);
}
