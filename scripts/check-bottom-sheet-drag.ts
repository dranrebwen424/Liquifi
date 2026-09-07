import assert from "node:assert/strict";
import { clampBottomSheetDrag } from "../lib/bottom-sheet-drag";

assert.equal(clampBottomSheetDrag(-80), -24);
assert.equal(clampBottomSheetDrag(0), 0);
assert.equal(clampBottomSheetDrag(180), 180);
assert.equal(clampBottomSheetDrag(999), 320);

console.log("bottom-sheet drag checks passed");
