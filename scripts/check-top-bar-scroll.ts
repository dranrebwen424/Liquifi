import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTopBarScroll } from "../lib/top-bar-scroll";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });

// Bottom-of-scroll jank guards: shells must track the visual viewport, sliding
// bars must stop animating at the document end, and the fixed mobile tab bar
// must have matching content padding.
for (const layout of [
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
]) {
  assert.match(read(layout), /min-h-dvh/, `${layout} must size with dvh, not 100vh`);
  assert.doesNotMatch(read(layout), /min-h-screen/, `${layout} must not use 100vh`);
}

assert.match(
  read("hooks/useAutoHideTopBar.ts"),
  /scrollHeight/,
  "auto-hide hook must freeze the bar at the document end",
);
assert.match(
  read("hooks/useAutoHideTopBar.ts"),
  /FAST_SCROLL_DELTA/,
  "auto-hide hook must skip bar flips during a fast fling",
);
assert.match(
  read("components/treasurer/MobileTopBar.tsx"),
  /Math\.abs\(moved\) >= 8/,
  "treasurer top bar needs 8px hysteresis to stop flip-flopping",
);
assert.match(
  read("components/treasurer/MobileTopBar.tsx"),
  /FAST_SCROLL_DELTA/,
  "treasurer top bar must skip flips during a fast fling",
);
assert.match(
  read("components/admin/DepartmentDetailClient.tsx"),
  /pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\]/,
  "department panel must clear the fixed mobile tab bar",
);
// Layer promotion on a position:sticky bar is a scroll-time jitter source on
// Android Chrome; only the fixed bottom nav may keep transform-gpu.
for (const bar of [
  "hooks/useAutoHideTopBar.ts",
  "components/admin/AdminTopBar.tsx",
  "components/admin/AdminMobileTopBar.tsx",
  "components/treasurer/MobileTopBar.tsx",
]) {
  assert.doesNotMatch(read(bar), /transform-gpu/, `${bar} must not promote a sticky layer`);
}

console.log("top bar scroll check: all assertions passed");
