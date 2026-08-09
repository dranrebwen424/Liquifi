/**
 * Shared overspend math + derivation predicate (Step 18).
 * Dependency-free so server actions, queries, and the tsx check script can
 * all share the exact same money logic without pulling in Next/InsForge.
 */

/**
 * Cents-precise remaining budget AFTER deducting an entry, against
 * already-deducted entries only — mirrors confirmReceiptEntry's server math.
 * Negative result means the entry pushes the event over budget.
 */
export function remainingAfterEntryCents(
  budgetTotal: number | string,
  spentRows: Array<{ amount: number | string }>,
  amount: number,
): number {
  const spentCents = spentRows.reduce(
    (sum, row) => sum + Math.round(Number(row.amount) * 100),
    0,
  );
  return (
    Math.round(Number(budgetTotal) * 100) - spentCents - Math.round(amount * 100)
  );
}

/**
 * Fires ONCE — true only for the FIRST entry that pushes the event below
 * zero. Spent rows are the already-deducted entries; when the event is
 * already over budget, the crossing already happened, so later entries
 * never re-trigger the overspend explanation gate.
 */
export function entryCausesOverspend(
  budgetTotal: number | string,
  spentRows: Array<{ amount: number | string }>,
  amount: number,
): boolean {
  const remainingBeforeCents =
    Math.round(Number(budgetTotal) * 100) -
    spentRows.reduce(
      (sum, row) => sum + Math.round(Number(row.amount) * 100),
      0,
    );
  if (remainingBeforeCents < 0) return false; // already over — crossing happened earlier
  return remainingBeforeCents - Math.round(amount * 100) < 0;
}

/**
 * A deducted entry counts as an UNRESOLVED overspend until Phase 8 stamps
 * overspend_resolved_at at report approval. The status filter is what makes
 * rejection auto-resolve: a rejected/pending/voided entry never counts.
 */
export function isUnresolvedOverspendEntry(
  status: string,
  causesOverspend: unknown,
  resolvedAt: unknown,
): boolean {
  return status === "deducted" && causesOverspend === true && !resolvedAt;
}
