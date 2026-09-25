import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTopBarScroll } from "../lib/top-bar-scroll";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });

// Bottom-of-scroll jank guards. Shells must be `min-h-[calc(100dvh+<slack>)]` on
// mobile: the scroll range must stay positive whether or not mobile browser UI
// is showing. Content shorter than the LARGEST viewport means the range collapses
// to 0 the instant the URL bar hides, the browser clamps scrollY to 0, the bar
// re-shows, and the page oscillates ("bounces back to top, then back to bottom").
// A constant unit (100vh) does not help — the document is still shorter than the
// viewport once the UI hides. Dynamic unit + slack keeps the range identical in
// both UI states, so nothing clamps and the bar stays hidden. Desktop has no
// dynamic UI, so it stays on min-h-screen.
for (const layout of [
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
]) {
  assert.match(
    read(layout),
    /min-h-\[calc\(100dvh\+\d+rem\)\]/,
    `${layout} must keep a positive scroll range in both mobile UI states`,
  );
  assert.match(read(layout), /md:min-h-screen/, `${layout} must not pad desktop`);
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
