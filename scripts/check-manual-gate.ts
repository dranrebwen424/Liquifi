/**
 * Runnable check for the Step 16 manual-entry gate math (money path).
 * Run: npx tsx scripts/check-manual-gate.ts
 *
 * Verifies the spec table from the Step 16 plan:
 * threshold = max(minCeiling, round(budget × pct%)) — per form, never cumulative.
 */
import assert from "node:assert";
import { CATEGORIES, manualGateThresholdCents } from "../components/entries/manual-categories";

const transport = CATEGORIES.transportation; // 20%, floor ₱300
const meals = CATEGORIES.meals; // 55%, floor ₱500
const rental = CATEGORIES.rental; // 65%, floor ₱1,000
const honorarium = CATEGORIES.honorarium; // 45%, floor ₱1,000

// Budget-relative ceiling dominates on normal budgets
assert.equal(manualGateThresholdCents(10_000, transport), 2_000 * 100);
assert.equal(manualGateThresholdCents(10_000, meals), 5_500 * 100);

// Floor protects small-budget events (approved tradeoff: ₱800 rental on ₱1,000 passes)
assert.equal(manualGateThresholdCents(1_000, rental), 1_000 * 100);
assert.equal(manualGateThresholdCents(1_000, honorarium), 1_000 * 100);

// Floor still applies when the percentage of a big budget is below it
assert.equal(manualGateThresholdCents(1_200, transport), Math.max(300, 240) * 100);

// Per-form semantics: threshold is a fixed snapshot, not cumulative
const t = manualGateThresholdCents(10_000, transport);
assert.equal(t, 2_000 * 100); // unchanged no matter how many entries precede it

console.log("gate check: all assertions passed");
