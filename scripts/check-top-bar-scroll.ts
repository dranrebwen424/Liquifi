import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAtScrollBoundary, resolveTopBarScroll } from "../lib/top-bar-scroll";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });

// Boundary detection. The bottom cases model an elastic spring-back: the browser
// reports scroll positions at and beyond the maximum while the page bounces.
assert.equal(isAtScrollBoundary(0, 800, 3000), true, "top edge is a boundary");
assert.equal(isAtScrollBoundary(500, 800, 3000), false, "mid page is not a boundary");
assert.equal(isAtScrollBoundary(2190, 800, 3000), false, "just short of the end is still scrollable");
assert.equal(isAtScrollBoundary(2200, 800, 3000), true, "flush with the end is a boundary");
assert.equal(isAtScrollBoundary(2260, 800, 3000), true, "overscrolled past the end is a boundary");
// Every position from the overscroll peak back down to flush (2260 -> 2200) is a
// boundary, so a spring-back never reads as a scroll-up intent.
assert.equal(isAtScrollBoundary(2210, 800, 3000), true, "mid spring-back is a boundary");

// Bottom-of-scroll jank guards. Shells must be `min-h-[125vh]` on mobile — a
// CONSTANT unit with enough range that a one-screen page behaves like a long one.
// Measured discriminator: long pages scroll fine, short pages bounce, on every
// phone tried, never on desktop. Evidence that the app is not the cause: on the
// deployed short page, 0 DOM mutations while scrolling and 0 px of self-motion
// across 201 frames with zero input. What is left is the browser's own toolbar:
// it hides on a downward scroll and returns on an upward one, and with only a
// few dozen scrollable pixels it toggles constantly mid-gesture. A 125vh floor
// gives ~380px of range so the toolbar hides early and never has to come back.
// Units that track the UI (dvh/svh/lvh) are banned: the document then resizes
// every frame while the toolbar animates. 100vh is the largest viewport and is
// constant on iOS Safari and Chrome Android. Desktop: no toolbar, no extra height.
for (const layout of [
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
]) {
  const source = read(layout);
  assert.match(
    source,
    /min-h-\[125vh\]/,
    `${layout} must keep a one-screen page scrollable enough to settle the toolbar`,
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
  /isAtScrollBoundary/,
  "auto-hide hook must freeze the bar at either scroll boundary",
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
  read("components/treasurer/MobileTopBar.tsx"),
  /isAtScrollBoundary/,
  "treasurer top bar must freeze at either scroll boundary",
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
