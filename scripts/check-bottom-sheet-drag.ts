import assert from "node:assert/strict";
import {
  SNAPS,
  TOP_INDEX,
  clampSheetTranslate,
  resolveReleaseTarget,
  snapTranslate,
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

console.log("bottom-sheet snap checks passed");