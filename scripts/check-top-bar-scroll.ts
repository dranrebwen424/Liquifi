import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTopBarScroll } from "../lib/top-bar-scroll";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });

// Bottom-of-scroll jank guards. Shells MUST use a constant viewport unit
// (min-h-screen = 100vh = largest viewport). A dynamic unit (dvh/svh/lvh) makes
// the document height track mobile browser UI, so the instant the URL bar hides
// and the visual viewport grows past the content, the browser clamps scrollY to
// 0 — measured on /admin/profile: y 26 -> 0 when the viewport grew 844 -> 980.
// That reads as "bounces back to top, then back to bottom". Dead space below
// short content is the cheaper trade.
for (const layout of [
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
]) {
  assert.match(read(layout), /min-h-screen/, `${layout} must use a constant viewport unit`);
  assert.doesNotMatch(
    read(layout),
    /min-h-d(vh|svh|lvh)|100d(vh|vh)|100svh|100lvh/,
    `${layout} must not use a dynamic viewport unit (clamps scrollY when browser UI hides)`,
  );
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
