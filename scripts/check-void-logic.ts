/**
 * Runnable check for the Step 17 void-logic (money/state path).
 * Run: npx tsx scripts/check-void-logic.ts
 *
 * Verifies `deriveBudgetLocked` — the "ever deducted" rule:
 * a voided entry must NEVER reopen budget editing (budget_locked stays true).
 */
import assert from "node:assert";
import { deriveBudgetLocked } from "../lib/budget-lock";

// Deducted locks the budget
assert.equal(deriveBudgetLocked(["deducted"]), true);
assert.equal(deriveBudgetLocked(["ai_parsed", "deducted"]), true);

// Voided after deduction still locks the budget (historical fact, never reopened)
assert.equal(deriveBudgetLocked(["voided"]), true);
assert.equal(deriveBudgetLocked(["ai_parsed", "deducted", "voided"]), true);

// Only pre-deduction statuses → unlocked
assert.equal(deriveBudgetLocked([]), false);
assert.equal(deriveBudgetLocked(["draft", "ai_parsed", "pending_approval"]), false);
assert.equal(deriveBudgetLocked(["rejected", "discarded"]), false);

// Voided alone (all deducted entries voided) stays locked — the Step 17 regression
assert.equal(deriveBudgetLocked(["voided", "voided"]), true);
assert.equal(deriveBudgetLocked(["voided", "rejected", "discarded"]), true);

console.log("void check: all assertions passed");
