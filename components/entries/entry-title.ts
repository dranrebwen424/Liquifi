import { CATEGORIES, type ExpenseType } from "@/components/entries/manual-categories";

type TitleSource = {
  supplierName?: string | null;
  description?: string | null;
  category?: string | null;
  formPayload?: unknown;
  itemBreakdown?: unknown;
};

function firstBreakdownItem(breakdown: unknown): string | null {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;
  const first = breakdown[0] as Record<string, unknown> | undefined;
  const desc = first?.description;
  return typeof desc === "string" && desc.trim() ? desc.trim() : null;
}

/**
 * Human title for an entry row. Receipts use the vendor (supplier_name); manual
 * entries have no supplier, so we derive "Category — detail" from the stored
 * form payload (recipient → route → occasion → first line item), falling back
 * to the bare category label, then "Untitled entry".
 */
export function entryTitle(e: TitleSource): string {
  if (e.supplierName) return e.supplierName;
  if (e.description) return e.description;

  const label = CATEGORIES[(e.category ?? "") as ExpenseType]?.label;
  if (!label) return "Untitled entry";

  const payload = (e.formPayload ?? null) as Record<string, unknown> | null;
  const detail =
    (typeof payload?.recipient === "string" && payload.recipient.trim()) ||
    (typeof payload?.route === "string" && payload.route.trim()) ||
    (typeof payload?.occasion === "string" && payload.occasion.trim()) ||
    firstBreakdownItem(e.itemBreakdown);

  return detail ? `${label} — ${detail}` : label;
}
