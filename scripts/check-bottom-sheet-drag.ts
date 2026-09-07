import assert from "node:assert/strict";
import {
  SNAPS,
  TOP_INDEX,
  clampSheetTranslate,
  resolveSnapIndex,
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

// fling thresholds: > 0.8 px/ms down -> dismiss snap, < -0.8 -> full
assert.equal(resolveSnapIndex(0, 2, 800), 0);
assert.equal(resolveSnapIndex(0, -2, 800), TOP_INDEX);

// no velocity -> nearest snap (midpoints are exact ties -> lower index wins)
assert.equal(resolveSnapIndex(0, 0, 800), TOP_INDEX);
assert.equal(resolveSnapIndex(200, 0, 800), 1);
assert.equal(resolveSnapIndex(400, 0, 800), 1);
assert.equal(resolveSnapIndex(540, 0, 800), 0);
assert.equal(resolveSnapIndex(680, 0, 800), 0);

// moderate velocity does not override nearest-snap (only the fling gates do)
assert.equal(resolveSnapIndex(400, 0.3, 800), 1);

console.log("bottom-sheet snap checks passed");