/**
 * `budget_locked` is DERIVED: true once any entry was ever deducted.
 * Voided entries still count — voiding never reopens the budget (historical fact).
 * Pure (no imports) so it can be asserted in scripts.
 */
export function deriveBudgetLocked(statuses: string[]): boolean {
  return statuses.some((s) => s === "deducted" || s === "voided");
}
