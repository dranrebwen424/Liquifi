import assert from "node:assert/strict";
import {
  BOTTOM_NUDGE_MAX,
  MOMENTUM_MIN_VELOCITY,
  MOMENTUM_TAU,
  SNAPS,
  TOP_INDEX,
  TOP_PULL_BAND,
  bottomNudge,
  clampSheetTranslate,
  elasticOffset,
  momentumDecay,
  resolveReleaseTarget,
  snapTranslate,
  topPull,
} from "../lib/bottom-sheet-drag";

// snapTranslate math
assert.equal(SNAPS.length, 3);
assert.equal(TOP_INDEX, 2);
assert.equal(snapTranslate(TOP_INDEX, 800), 0); // top snap rests flush
assert.equal(snapTranslate(0, 800), 800 * (1 - SNAPS[0]));
assert.equal(snapTranslate(1, 800), 800 * 0.5);

// clamp bounds: -24 kick up, sheetHeight down, 320 fallback while unmeasured
assert.equal(clampSheetTranslate(-80, 800), -24);
assert.equal(clampSheetTranslate(0, 800), 0);
assert.equal(clampSheetTranslate(180, 800), 180);
assert.equal(clampSheetTranslate(999, 800), 800);
assert.equal(clampSheetTranslate(999, 0), 320);

// release decision matrix (h = 800, dismiss line at 400)
// fast flings always win regardless of translate or start snap
assert.deepEqual(resolveReleaseTarget(0, 2, TOP_INDEX, 800), { action: "dismiss" });
assert.deepEqual(resolveReleaseTarget(600, 2, 1, 800), { action: "dismiss" });
assert.deepEqual(resolveReleaseTarget(0, -2, TOP_INDEX, 800), { action: "snap", index: TOP_INDEX, spring: false });
assert.deepEqual(resolveReleaseTarget(600, -2, 1, 800), { action: "snap", index: TOP_INDEX, spring: false });

// slow release before the mid line -> spring back to the start snap
assert.deepEqual(resolveReleaseTarget(0, 0, TOP_INDEX, 800), { action: "snap", index: TOP_INDEX, spring: true });
assert.deepEqual(resolveReleaseTarget(200, 0, TOP_INDEX, 800), { action: "snap", index: TOP_INDEX, spring: true });
assert.deepEqual(resolveReleaseTarget(200, 0, 1, 800), { action: "snap", index: 1, spring: true });
assert.deepEqual(resolveReleaseTarget(399, 0.5, TOP_INDEX, 800), { action: "snap", index: TOP_INDEX, spring: true });

// moderate downward velocity below the fling gate does not dismiss on its own
assert.deepEqual(resolveReleaseTarget(200, 0.3, TOP_INDEX, 800), { action: "snap", index: TOP_INDEX, spring: true });

// slow release at/after the mid line -> dismiss, from any start snap
assert.deepEqual(resolveReleaseTarget(400, 0, TOP_INDEX, 800), { action: "dismiss" });
assert.deepEqual(resolveReleaseTarget(401, 0, 1, 800), { action: "dismiss" });
assert.deepEqual(resolveReleaseTarget(600, 0.1, TOP_INDEX, 800), { action: "dismiss" });

// top-edge rubber-band: positive passes through 1:1, negative is resisted on
// a diminishing curve toward the -24 asymptote (never overshoots it)
assert.equal(elasticOffset(100), 100);
assert.equal(elasticOffset(0), 0);
assert.equal(elasticOffset(-24), -24 * (1 - Math.exp(-24 / 48)));
assert.equal(elasticOffset(-240), -24 * (1 - Math.exp(-240 / 48)));
assert(elasticOffset(-240) < elasticOffset(-24)); // deeper pull, more visible — but below the cap
assert(elasticOffset(-240) > -24);
assert(elasticOffset(-24) > -24); // already resisted, not at the cap
assert(Math.abs(elasticOffset(-100000) - -24) < 0.001); // asymptote

// end-of-content nudge: 0 or up-drag yields nothing, down-drag resists toward
// BOTTOM_NUDGE_MAX, and a fling that exceeds the nudge still drains to the cap
assert.equal(bottomNudge(-10), 0);
assert.equal(bottomNudge(0), 0);
assert.equal(bottomNudge(36), 36 * (1 - Math.exp(-1)));
assert(bottomNudge(36) > 0 && bottomNudge(36) < 36);
assert(bottomNudge(200) > bottomNudge(36)); // monotonic while below the asymptote
assert(Math.abs(bottomNudge(100000) - BOTTOM_NUDGE_MAX) < 0.001); // asymptote

// top-edge rubber band: negative passthrough, resisted (lags the finger)
// inside the band, exactly continuous at the seam, 1:1 beyond it, monotonic
assert.equal(topPull(-10), -10);
assert.equal(topPull(0), 0);
assert.equal(topPull(TOP_PULL_BAND), TOP_PULL_BAND); // seam: no offset jump
assert(topPull(24) > 0 && topPull(24) < 24); // the band lags the finger
assert.equal(topPull(100), 100); // past the band: 1:1
assert(topPull(TOP_PULL_BAND + 1) > topPull(TOP_PULL_BAND)); // monotonic
assert(topPull(24) < topPull(32)); // monotonic inside the band

// momentum glide: velocity decays exponentially toward 0, never changes sign
assert.equal(momentumDecay(1, 0), 1);
assert.equal(momentumDecay(-1, 0), -1);
assert(momentumDecay(1, 50) > 0 && momentumDecay(1, 50) < 1);
assert(momentumDecay(-1, 50) < 0 && momentumDecay(-1, 50) > -1);
assert(momentumDecay(1, 1000) > 0 && Math.abs(momentumDecay(1, 1000)) < 0.02);
assert(MOMENTUM_TAU > 0 && MOMENTUM_MIN_VELOCITY > 0);

console.log("bottom-sheet snap checks passed");