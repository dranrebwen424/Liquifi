/**
 * `budget_locked` is DERIVED: true once ANY entry row exists for the event,
 * regardless of status (deducted, pending_approval, ai_parsed, voided, etc.).
 * The budget is editable only while the event is completely untouched — the
 * moment the first entry is added (even a not-yet-approved manual entry), the
 * budget becomes immutable. Locks never reopen (a later void keeps it locked).
 * Pure (no imports) so it can be asserted in scripts.
 */
export function deriveBudgetLocked(statuses: string[]): boolean {
  return statuses.length > 0;
}
