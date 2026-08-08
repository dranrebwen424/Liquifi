import type { EntryForDashboard } from "@/lib/queries/events";

export type SpendingBreakdownItem = {
  name: string;
  amount: number;
  percentage: number;
};

/**
 * Real per-category spend from deducted entries.
 * Receipts fall back to their verbatim `document_type_raw` label when no
 * normalized category exists. Shared by the dashboard card (top 4) and the
 * full breakdown section on the report page.
 */
export function computeSpendingBreakdown(
  entries: EntryForDashboard[],
): SpendingBreakdownItem[] {
  const deducted = entries.filter((e) => e.status === "deducted");
  if (deducted.length === 0) return [];

  const total = deducted.reduce((sum, e) => sum + Number(e.amount), 0);
  const byName = new Map<string, number>();
  for (const e of deducted) {
    const name = e.category ?? e.document_type_raw;
    if (!name) continue;
    byName.set(name, (byName.get(name) ?? 0) + Number(e.amount));
  }

  return [...byName.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}
