/**
 * Runnable check for the Step 17 void-logic (money/state path).
 * Run: npx tsx scripts/check-void-logic.ts
 *
 * Verifies `deriveBudgetLocked` — the "any entry row exists" rule (08-30):
 * budget_locked is true once ANY entry row exists for the event regardless of
 * status; locks never reopen (a later void keeps it locked).
 */
import assert from "node:assert";
import { deriveBudgetLocked } from "../lib/budget-lock";

// Any entry row locks the budget — deducted, and even pre-deduction statuses
assert.equal(deriveBudgetLocked(["deducted"]), true);
assert.equal(deriveBudgetLocked(["ai_parsed", "deducted"]), true);
assert.equal(deriveBudgetLocked(["draft", "ai_parsed", "pending_approval"]), true);
assert.equal(deriveBudgetLocked(["rejected", "discarded"]), true);

// Voided after deduction still locks the budget (historical fact, never reopened)
assert.equal(deriveBudgetLocked(["voided"]), true);
assert.equal(deriveBudgetLocked(["ai_parsed", "deducted", "voided"]), true);

// No entry rows at all → unlocked
assert.equal(deriveBudgetLocked([]), false);

// Voided alone (all deducted entries voided) stays locked — the Step 17 regression
assert.equal(deriveBudgetLocked(["voided", "voided"]), true);
assert.equal(deriveBudgetLocked(["voided", "rejected", "discarded"]), true);

console.log("void check: all assertions passed");
