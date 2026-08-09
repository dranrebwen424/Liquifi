/**
 * Runnable check for the Step 27 notification retention boundary.
 * Run: npx tsx scripts/check-notification-retention.ts
 *
 * The deployed InsForge scheduled function executes:
 *   DELETE FROM notifications WHERE created_at < now() - interval '1 year';
 * (see scripts/sql/notification-retention.sql — keep this predicate in sync).
 *
 * AuditLog is never touched by the job: the DELETE statement targets only the
 * notifications table. This script pins the boundary logic the SQL encodes —
 * exactly the notification rows older than one year are removed, regardless
 * of read state, and nothing newer survives.
 */
import assert from "node:assert";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Mirrors the SQL WHERE clause: strictly older than one year.
function olderThanOneYear(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() > ONE_YEAR_MS;
}

const now = new Date("2026-08-09T12:00:00.000Z");
const oneYearAgo = new Date(now.getTime() - ONE_YEAR_MS); // 2025-08-09T12:00:00Z

// — Deleted: strictly older than one year, regardless of read state —
assert.equal(olderThanOneYear(new Date("2025-08-09T11:59:59.000Z"), now), true); // 1y − 1s
assert.equal(olderThanOneYear(new Date("2024-01-01T00:00:00.000Z"), now), true); // years old, read
assert.equal(olderThanOneYear(new Date("2024-01-01T00:00:00.000Z"), now), true); // years old, unread — same predicate
assert.equal(olderThanOneYear(new Date("2020-06-15T08:30:00.000Z"), now), true); // six years old

// — Kept: at or newer than the boundary —
assert.equal(olderThanOneYear(oneYearAgo, now), false); // exactly 1 year — NOT strictly older
assert.equal(olderThanOneYear(new Date("2025-08-09T12:00:01.000Z"), now), false); // 1y + 1s
assert.equal(olderThanOneYear(new Date("2026-08-09T11:59:00.000Z"), now), false); // 1 minute old
assert.equal(olderThanOneYear(now, now), false); // just created

// — Structural guarantee: the DELETE only ever references notifications.
// AuditLog rows are immune by construction; no assertion can run against the
// deployed SQL here, so the statement itself (scripts/sql/notification-retention.sql)
// is the artifact under review, and this predicate is its runnable mirror. —

console.log("notification retention boundary: all assertions passed");
