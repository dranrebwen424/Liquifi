import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTopBarScroll } from "../lib/top-bar-scroll";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });

// Bottom-of-scroll jank guards. Shells must be `min-h-[calc(100vh+<slack>)]` on
// mobile — a CONSTANT unit plus slack. Measured discriminator: long pages scroll
// fine, short pages bounce. On a long page the floor never binds, so the document
// is content-bound and its height is constant. On a short page the floor binds:
//   - dynamic unit (100dvh): the document resizes every frame while the browser UI
//     animates, the browser compensates scrollY, and the page oscillates.
//   - no slack (100vh alone): the document is shorter than the largest viewport,
//     so the range collapses to 0 the moment the UI hides and scrollY clamps to 0.
// Constant + slack: a document that never resizes and a range that never hits 0.
// 100vh is the largest viewport and is constant on iOS Safari and Chrome Android
// (the classic iOS "100vh is too tall" behaviour). Desktop: no dynamic UI, no slack.
for (const layout of [
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
]) {
  const source = read(layout);
  assert.match(
    source,
    /min-h-\[calc\(100vh\+\d+rem\)\]/,
    `${layout} must use a constant viewport unit plus slack`,
  );
  assert.doesNotMatch(
    source,
    /dvh|svh|lvh/,
    `${layout} must not tie document height to the dynamic viewport`,
  );
  assert.match(source, /md:min-h-screen/, `${layout} must not pad desktop`);
}

assert.match(
  read("app/globals.css"),
  /overscroll-behavior-y: contain/,
  "mobile overscroll must not feed back into the page",
);

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

// The desktop admin bar is static by decision: auto-hide is a mobile affordance
// and every scroll listener on desktop was pure cost. It must not re-introduce
// a scroll listener, and only the mobile bars may drive auto-hide.
assert.doesNotMatch(
  read("components/admin/AdminTopBar.tsx"),
  /useAutoHideTopBar|addEventListener\("scroll"/,
  "desktop admin top bar must stay static (no scroll listener)",
);
assert.doesNotMatch(
  read("components/admin/AdminTopBar.tsx"),
  /transition-transform|translate-y-full/,
  "desktop admin top bar must not translate",
);
for (const mobileBar of [
  "hooks/useAutoHideTopBar.ts",
  "components/admin/AdminMobileTopBar.tsx",
]) {
  assert.match(read(mobileBar), /useAutoHideTopBar|resolveTopBarScroll/, `${mobileBar} keeps auto-hide`);
}

console.log("top bar scroll check: all assertions passed");
