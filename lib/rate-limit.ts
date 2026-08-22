/**
 * In-memory escalating lockout for login attempts.
 * ponytail: single-process Map — resets on deploy and is per-instance.
 * Upgrade path: back with a DB table if this ever runs multiple instances
 * or needs admin-visible attack history.
 */

type Bucket = {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number;
};

export type BucketConfig = {
  /** Failures allowed before the first lockout kicks in */
  threshold: number;
  /** Duration of the first lockout; doubles with each further failure */
  baseMs: number;
  /** Upper bound on lockout duration */
  capMs: number;
};

/** Email bucket — targeted brute force on one account */
export const EMAIL_LIMIT: BucketConfig = {
  threshold: 5,
  baseMs: 60_000,
  capMs: 30 * 60_000,
};

/** IP bucket — credential spraying across accounts from one machine */
export const IP_LIMIT: BucketConfig = {
  threshold: 15,
  baseMs: 60_000,
  capMs: 60 * 60_000,
};

/** Buckets expire this long after their last recorded failure */
const IDLE_TTL_MS = 24 * 60 * 60 * 1000;
/** Safety valve so a flooding attacker cannot grow the Map without bound */
const MAX_BUCKETS = 5000;

const buckets = new Map<string, Bucket>();

function delayFor(failures: number, config: BucketConfig): number {
  if (failures < config.threshold) return 0;
  return Math.min(config.baseMs * 2 ** (failures - config.threshold), config.capMs);
}

function pruneIfHeavy(): void {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastFailureAt > IDLE_TTL_MS) buckets.delete(key);
  }
  // ponytail: extreme fallback under active flood — losing counters is safe here,
  // unbounded memory growth is not.
  if (buckets.size > MAX_BUCKETS) buckets.clear();
}

export type LockStatus = {
  blocked: boolean;
  retryAfterSec: number;
};

export function checkRateLimit(key: string): LockStatus {
  pruneIfHeavy();
  const bucket = buckets.get(key);
  const now = Date.now();
  if (!bucket || now >= bucket.lockedUntil) {
    return { blocked: false, retryAfterSec: 0 };
  }
  return {
    blocked: true,
    retryAfterSec: Math.max(1, Math.ceil((bucket.lockedUntil - now) / 1000)),
  };
}

/** Records one failed attempt and starts/extends the lockout ladder. Returns attempts left before lock. */
export function recordFailure(key: string, config: BucketConfig): number {
  pruneIfHeavy();
  const now = Date.now();
  const bucket = buckets.get(key) ?? { failures: 0, lockedUntil: 0, lastFailureAt: now };
  bucket.failures += 1;
  bucket.lastFailureAt = now;
  bucket.lockedUntil = now + delayFor(bucket.failures, config);
  buckets.set(key, bucket);
  return Math.max(0, config.threshold - bucket.failures);
}

/** Called once credentials are proven correct — prior typos are forgiven. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
