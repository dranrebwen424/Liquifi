// Agent I/O contracts — zod schemas for every OpenRouter response we consume.
// Validate with safeParse, never parse; agent output is not guaranteed to match.

import { z } from "zod";

export const itemBreakdownSchema = z.object({
  description: z.string().min(1),
  qty: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  lineAmount: z.number().nonnegative(),
});

/** Classification the model returns alongside extraction fields — drives the guided-upload outcomes. */
export const classificationSchema = z.object({
  outcome: z.enum(["valid", "borderline", "invalid", "multiple"]),
  reason: z.string().min(1),
});

/**
 * Raw Gemini response — self-classified, nullable fields. The model may not be able to
 * extract anything (borderline/invalid) or may lack a printed label/number (valid with "").
 */
export const receiptResponseSchema = z
  .object({
    classification: classificationSchema,
    document_type_raw: z.string().nullable(),
    document_type_category: z.string().nullable(),
    category: z.string().nullable(),
    document_number: z.string().nullable(),
    issue_date: z.string().nullable(),
    issue_time: z.string().nullable(),
    supplier_name: z.string().nullable(),
    amount: z.number().positive().nullable(),
    item_breakdown: z.array(itemBreakdownSchema).nullable(),
  })
  .superRefine((d, ctx) => {
    // "valid" means traceable: supplier + amount + ≥1 item. Everything else may be empty
    // (handwritten slips often have no label; numberless receipts are valid per spec).
    if (d.classification.outcome === "valid") {
      if (!d.supplier_name) {
        ctx.addIssue({ code: "custom", path: ["supplier_name"], message: "required when outcome is valid" });
      }
      if (!d.amount) {
        ctx.addIssue({ code: "custom", path: ["amount"], message: "required when outcome is valid" });
      }
      if (!d.item_breakdown?.length) {
        ctx.addIssue({ code: "custom", path: ["item_breakdown"], message: "required when outcome is valid" });
      }
    }
  });

/** Strict, non-null receipt — the valid path's guaranteed shape (matches Entry columns). */
export const receiptParseSchema = z.object({
  document_type_raw: z.string(), // may be "" — handwritten slips have no printed label
  document_type_category: z.string().min(1),
  category: z.string().min(1), // expense category, normalized to EXPENSE_CATEGORIES
  document_number: z.string(), // may be "" — no label-tied number is valid, never null
  issue_date: z.string(), // may be "" — some receipts print no date
  issue_time: z.string().nullable().optional(),
  supplier_name: z.string().min(1),
  amount: z.number().positive(),
  item_breakdown: z.array(itemBreakdownSchema).min(1),
});

export type ReceiptParseResult = z.infer<typeof receiptParseSchema>;

/** Discriminated parse result — verdicts short-circuit, only "valid" carries the strict receipt. */
export type ParseOutcome =
  | { outcome: "valid"; receipt: ReceiptParseResult }
  | { outcome: "borderline" | "invalid" | "multiple"; reason: string };

/** System-normalized document-type categories — for reporting only, falls back to "other". */
export const DOCUMENT_TYPE_CATEGORIES = [
  "official_receipt",
  "sales_invoice",
  "cash_sales_invoice",
  "delivery_receipt",
  "acknowledgement_receipt",
  "collection_receipt",
  "other",
] as const;

export function normalizeCategory(category: string): string {
  return DOCUMENT_TYPE_CATEGORIES.includes(category as (typeof DOCUMENT_TYPE_CATEGORIES)[number])
    ? category
    : "other";
}

/** Expense-category taxonomy — mirrors the manual-entry flow (manual-categories.ts). */
export const EXPENSE_CATEGORIES = [
  "transportation",
  "meals",
  "honorarium",
  "supplies",
  "printing",
  "rental",
  "others",
] as const;

/** Normalize the AI's inferred expense category — anything outside the taxonomy → "others". */
export function normalizeExpenseCategory(category: string): string {
  return EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])
    ? category
    : "others";
}

/** Client-facing camelCase shape — what ReceiptReview renders (was MockParsedReceipt). */
export type ParsedReceipt = {
  documentTypeRaw: string;
  documentTypeCategory: string;
  category: string;
  documentNumber: string;
  issueDate: string;
  issueTime: string | null;
  supplierName: string;
  amount: number;
  itemBreakdown: {
    description: string;
    qty: number;
    unitPrice: number;
    lineAmount: number;
  }[];
};

export function toParsedReceiptClient(r: ReceiptParseResult): ParsedReceipt {
  return {
    documentTypeRaw: r.document_type_raw,
    documentTypeCategory: r.document_type_category,
    category: r.category,
    documentNumber: r.document_number,
    issueDate: r.issue_date,
    issueTime: r.issue_time ?? null,
    supplierName: r.supplier_name,
    amount: r.amount,
    itemBreakdown: r.item_breakdown.map((i) => ({
      description: i.description,
      qty: i.qty,
      unitPrice: i.unitPrice,
      lineAmount: i.lineAmount,
    })),
  };
}

// ─── Document Verification (signed-report completeness check) ───────

/** Per-check verdict from the OpenRouter document verifier. */
export const documentCheckSchema = z.object({
  passed: z.boolean(),
  reason: z.string().min(1),
});

/**
 * Raw OpenRouter response for the signed-document completeness check.
 * `page_count_observed` is the model's count of distinct pages in the upload —
 * the route cross-checks it against the expected count parsed from the
 * generated PDF, which catches duplicate/missing page uploads that a pure
 * file-count comparison would miss.
 */
export const documentVerificationResponseSchema = z.object({
  document_number: documentCheckSchema,
  signatures: documentCheckSchema,
  page_count_observed: z.number().int().nonnegative(),
  summary: z.string().min(1),
});

export type DocumentVerificationResult = {
  checks: {
    document_number: { passed: boolean; reason: string };
    signatures: { passed: boolean; reason: string };
  };
  pageCountObserved: number;
  summary: string;
};
