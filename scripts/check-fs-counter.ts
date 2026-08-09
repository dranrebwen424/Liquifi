/**
 * Runnable check for the Step 20 FS document-number format (money path).
 * Run: npx tsx scripts/check-fs-counter.ts
 */
import assert from "node:assert";
import { formatFsNumber } from "../lib/report-number";

// Base format: FS-{DEPTCODE}-{YYYY}-{00001}, zero-padded to 5 digits
assert.equal(formatFsNumber("CCS", 2026, 1), "FS-CCS-2026-00001");
assert.equal(formatFsNumber("CCS", 2026, 2), "FS-CCS-2026-00002");
assert.equal(formatFsNumber("CCS", 2026, 12345), "FS-CCS-2026-12345");

// Sequence continues past 9 without padding drift
assert.equal(formatFsNumber("CAS", 2026, 10), "FS-CAS-2026-00010");
assert.equal(formatFsNumber("CBEA", 2026, 1000), "FS-CBEA-2026-01000");

// Resets per department per calendar year (year is part of the format)
assert.equal(formatFsNumber("CCS", 2027, 1), "FS-CCS-2027-00001");

console.log("fs-counter check: all assertions passed");
