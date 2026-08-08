/**
 * Runnable check for the Step 18 overspend helpers (money path).
 * Run: npx tsx scripts/check-overspend-gate.ts
 *
 * Verifies:
 *  1. remainingAfterEntryCents — the cents math the manual gate and the
 *     adviser backstop both use (negative = event goes over budget).
 *  2. isUnresolvedOverspendEntry — the Step 18 derivation predicate:
 *     counted only while `deducted` + flagged + unresolved.
 */
import assert from "node:assert";
import {
  remainingAfterEntryCents,
  isUnresolvedOverspendEntry,
  entryCausesOverspend,
} from "../lib/overspend";

// remainingAfter = (budget − sum(deducted)) − entry, in cents
assert.equal(remainingAfterEntryCents(1_000, [{ amount: 800 }], 300), -100 * 100);
assert.equal(remainingAfterEntryCents(1_000, [{ amount: 800 }], 200), 0);
assert.equal(remainingAfterEntryCents(1_000, [{ amount: 800 }], 199.99), 1); // 1 cent left
assert.equal(remainingAfterEntryCents(1_000, [{ amount: 800 }], 300.5), -100.5 * 100);
assert.equal(remainingAfterEntryCents(500, [], 500), 0); // exact budget, no trip
assert.equal(remainingAfterEntryCents(500, [{ amount: 250 }, { amount: 250 }], 0.01), -1); // tiny overspend still flagged

// Fires once: only the FIRST entry that pushes the event below zero trips.
assert.equal(entryCausesOverspend(1_000, [{ amount: 800 }], 200), false); // still positive
assert.equal(entryCausesOverspend(1_000, [{ amount: 800 }], 200.01), true); // first crossing
assert.equal(entryCausesOverspend(1_000, [{ amount: 800 }, { amount: 200.01 }], 1), false); // already over, no re-fire
assert.equal(entryCausesOverspend(500, [{ amount: 600 }], 1), false); // overspend happened earlier
assert.equal(entryCausesOverspend(500, [], 500), false); // exact budget, no trip
assert.equal(entryCausesOverspend(500, [], 500.01), true); // first entry over

// Predicate: only deducted + causes_overspend + not-yet-resolved counts
assert.equal(isUnresolvedOverspendEntry("deducted", true, null), true);
assert.equal(isUnresolvedOverspendEntry("deducted", true, "2026-08-07T00:00:00.000Z"), false); // resolved
assert.equal(isUnresolvedOverspendEntry("deducted", false, null), false); // not flagged
assert.equal(isUnresolvedOverspendEntry("pending_approval", true, null), false); // not deducted yet
assert.equal(isUnresolvedOverspendEntry("approved", true, null), false);
assert.equal(isUnresolvedOverspendEntry("rejected", true, null), false); // rejection auto-resolves
assert.equal(isUnresolvedOverspendEntry("voided", true, null), false);
assert.equal(isUnresolvedOverspendEntry("draft", true, null), false);

console.log("overspend check: all assertions passed");
