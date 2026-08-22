/**
 * Cycle-based escalating lockout for login attempts.
 *
 * Email buckets walk a 3-cycle ladder:
 *   cycle 1: 5 fails → 1 min cooldown
 *   cycle 2: 3 fails → 5 min cooldown
 *   cycle 3: 3 fails → soft lock (24 h, lifts via password reset or window expiry)
 *
 * IP buckets keep the flat doubling ladder (anti credential-spray).
 *
 * ponytail: single-process Map — resets on deploy and is per-instance.
 * Upgrade path: back with a DB table if this ever runs multiple instances
 * or needs admin-visible attack history.
 */

type Bucket = {
  /** Total failures (ladder mode) */
  failures: number;
  /** Current cycle, 1-based (cycles mode) */
  cycle: number;
  /** Failures within the current cycle (cycles mode) */
  failuresInCycle: number;
  /** True once cycle 3 is exhausted — full reset after the lock lifts */
  softLocked: boolean;
  lockedUntil: number;
  lastFailureAt: number;
};

type LadderConfig = {
  mode: "ladder";
  /** Failures allowed before the first lockout kicks in */
  threshold: number;
  /** Duration of the first lockout; doubles with each further failure */
  baseMs: number;
  /** Upper bound on lockout duration */
  capMs: number;
};

type CycleConfig = {
  attempts: number;
  cooldownMs: number;
};

type CyclesConfig = {
  mode: "cycles";
  cycles: CycleConfig[];
};

export type BucketConfig = LadderConfig | CyclesConfig;

/** Buckets expire this long after their last recorded failure */
const IDLE_TTL_MS = 24 * 60 * 60 * 1000;
/** Safety valve so a flooding attacker cannot grow the Map without bound */
const MAX_BUCKETS = 5000;

/** Email bucket — targeted brute force on one account.
 * Cycle 3's cooldown rides the same 24 h window as the idle TTL:
 * when the lock lifts, staleness wipes the bucket in the same breath. */
export const EMAIL_LIMIT: BucketConfig = {
  mode: "cycles",
  cycles: [
    { attempts: 5, cooldownMs: 60_000 },
    { attempts: 3, cooldownMs: 5 * 60_000 },
    { attempts: 3, cooldownMs: IDLE_TTL_MS },
  ],
};

/** IP bucket — credential spraying across accounts from one machine */
export const IP_LIMIT: BucketConfig = {
  mode: "ladder",
  threshold: 15,
  baseMs: 60_000,
  capMs: 60 * 60_000,
};

/**
 * Signup IP bucket — POST /api/auth/signup reveals account states
 * (none / in-progress / registered), so each attempt costs a tick.
 * Successful creations clear the bucket, so a shared-network rollout
 * week where many real people register never trips this.
 */
export const SIGNUP_IP_LIMIT: BucketConfig = {
  mode: "ladder",
  threshold: 10,
  baseMs: 60_000,
  capMs: 15 * 60_000,
};

const buckets = new Map<string, Bucket>();

function delayFor(failures: number, config: LadderConfig): number {
  if (failures < config.threshold) return 0;
  return Math.min(config.baseMs * 2 ** (failures - config.threshold), config.capMs);
}

function freshBucket(now: number): Bucket {
  return {
    failures: 0,
    cycle: 1,
    failuresInCycle: 0,
    softLocked: false,
    lockedUntil: 0,
    lastFailureAt: now,
  };
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
  /** True when the block is a cycle-3 soft lock (drives the reset-password modal) */
  softLocked: boolean;
};

export function checkRateLimit(key: string): LockStatus {
  pruneIfHeavy();
  const bucket = buckets.get(key);
  const now = Date.now();
  // Expired idle window or lifted lock → treat as absent. A soft-locked bucket
  // dies exactly at its TTL, so expiry and staleness coincide — no re-trap bug.
  if (!bucket || now >= bucket.lockedUntil || now - bucket.lastFailureAt > IDLE_TTL_MS) {
    return { blocked: false, retryAfterSec: 0, softLocked: false };
  }
  return {
    blocked: true,
    retryAfterSec: Math.max(1, Math.ceil((bucket.lockedUntil - now) / 1000)),
    softLocked: bucket.softLocked,
  };
}

/**
 * Records one failed attempt.
 * Returns attempts left in the current stage before lock (ladder: total; cycles: this cycle).
 */
export function recordFailure(key: string, config: BucketConfig): number {
  pruneIfHeavy();
  const now = Date.now();
  // Stale bucket (idle past TTL) starts over — an abandoned cycle-2 user
  // must not resume mid-ladder the next day.
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.lastFailureAt > IDLE_TTL_MS) {
    bucket = freshBucket(now);
  }

  if (config.mode === "ladder") {
    bucket.failures += 1;
    bucket.lastFailureAt = now;
    bucket.lockedUntil = now + delayFor(bucket.failures, config);
    buckets.set(key, bucket);
    return Math.max(0, config.threshold - bucket.failures);
  }

  const rule = config.cycles[Math.min(bucket.cycle - 1, config.cycles.length - 1)];
  bucket.failuresInCycle += 1;
  bucket.lastFailureAt = now;

  let remaining = Math.max(0, rule.attempts - bucket.failuresInCycle);
  if (bucket.failuresInCycle >= rule.attempts) {
    remaining = 0;
    const lastCycle = bucket.cycle >= config.cycles.length;
    if (lastCycle) {
      bucket.softLocked = true;
    } else {
      bucket.cycle += 1;
      bucket.failuresInCycle = 0;
    }
    bucket.lockedUntil = now + rule.cooldownMs;
  }

  buckets.set(key, bucket);
  return remaining;
}

/** Called once credentials are proven correct — prior typos are forgiven. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
