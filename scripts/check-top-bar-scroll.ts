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

// Bottom-of-scroll jank guard. The shell floor must add ZERO surplus scroll
// range, so a page shorter than the viewport is not scrollable at all: there is
// no document bottom edge to bounce off, no rubber band to pump, and the mobile
// toolbar is never triggered (a non-scrollable document keeps its toolbar
// permanently, which is the stable state every other site settles into).
//
// `100svh` is the smallest viewport, so surplus range is exactly 0 in both UI
// states: with the toolbar shown the document equals the viewport, and with it
// hidden the viewport is larger than the document. It is a CONSTANT unit, so the
// document does not resize while the toolbar animates.
//
// Units that leave surplus range or track the UI are banned. `100vh` is the
// largest viewport, so a short page stays scrollable by exactly the toolbar
// height (~50px) and the toolbar oscillates: it hides on a downward scroll,
// which zeroes the range and puts the page flush against its end, which brings
// the toolbar back, and round again. `dvh` ties the document to the live
// viewport, so the document resizes every frame mid-animation. An earlier
// revision used `125vh` (~211px of surplus); that removed the oscillation but
// replaced it with a rubber-band trap — on `/admin/approvals` the wrapper was
// 1055px tall around 360px of content, so 695px of empty background sat between
// the last row and a hard stop. Measured on the deployed app: 0 DOM mutations and
// 0px of self-motion across a full scroll-to-bottom, so the app was never moving
// anything — the void was the whole of the bounce. `svh` is required, so the ban
// has to avoid matching the `vh` inside it.
for (const layout of [
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
  "app/preview-dept/page.tsx",
]) {
  const source = read(layout);
  assert.match(
    source,
    /min-h-\[100svh\]/,
    `${layout} must floor at the smallest viewport, leaving no surplus scroll range`,
  );
  for (const banned of ["dvh", "lvh", "100vh", "min-h-screen"]) {
    assert.ok(
      !source.includes(banned),
      `${layout} must not use ${banned} — it leaves surplus range or tracks the live viewport`,
    );
  }
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
