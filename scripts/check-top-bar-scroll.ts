import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAtScrollBoundary, resolveTopBarScroll } from "../lib/top-bar-scroll";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** Source with comments stripped, so negative assertions match code, not prose. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

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

// Bottom-of-scroll jank guard — the real invariant.
//
// A page's document height must never land in the half-open band (svh, lvh].
// Inside that band, collapsing the mobile URL bar grows the viewport past the
// document, maxScroll goes NEGATIVE, and the browser clamps scrollY back up. The
// clamp reads as an upward scroll, which brings the URL bar back, which shrinks
// the viewport, which makes maxScroll positive again — a closed per-frame loop
// that is the "vibrating" bottom. This is not a rubber band and not an animation:
// measured on the deployed app, 0 running animations and 0 DOM mutations over
// 2.5s at the bottom, with overscroll-behavior already `none`.
//
// The signature is a page whose content sits a few tens of px above the small
// viewport, and that is exactly what was reported: /admin/profile content 870px
// (26px of range) and /admin/departments/[id] 888px (44px) were both broken,
// while /admin/departments at 1281px and /admin/approvals at 360px (unscrollable)
// were fine.
//
// So the floor is `100vh + 6rem`, applied uniformly. `100vh` IS the large
// viewport per spec and is CONSTANT, so the document never resizes while browser
// chrome animates. The +6rem is the load-bearing part: it keeps maxScroll at a
// positive 96px after the URL bar hides, so the toolbar has no reason to return.
// Device-independent — content can be any height, but the document is always
// above lvh, so the band is unreachable on any phone.
//
// Banned, and why:
//   100svh      floors at the SMALL viewport, so any content between svh and lvh
//               lands in the band. This was the regression: it looked perfect in
//               DevTools, which resolves svh/vh/dvh to one height.
//   100vh alone leaves exactly lvh-svh of range, which reaches 0 once the URL
//               bar hides — the same oscillation, reached from the other side.
//   125vh       clears the band but the slack is unbounded: on /admin/approvals
//               it put 695px of empty background between the last row and the
//               stop. 6rem bounds it at ~150px.
//               (Unit names are written out here rather than as literal class
//               names: Tailwind v4 scans every source file including this one
//               and emits a utility for each class-like token it finds, so naming
//               them literally would ship dead CSS for each banned variant.)
//   dvh         tracks the live viewport, so the document resizes every frame
//               mid-animation and any scroll anchoring fights it.
//   min-h-screen / min-h-dvh / h-full / min-h-full — the same two traps, or a
//               percentage that resolves against the large viewport.
const FLOORED_SURFACES = [
  "app/layout.tsx",
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
  "app/preview-dept/page.tsx",
  "app/page.tsx",
  "components/auth/AuthShell.tsx",
];
const SLACK_FLOOR = /min-h-\[calc\(100vh\+[1-9]\d*rem\)\]/;
// `min-h-full` is banned everywhere: it propagates a percentage min-height up the
// box chain and resolves against the large viewport. Plain `h-full` is NOT banned
// here — cards use it to fill their grid track, which is unrelated to the viewport
// (app/page.tsx cardClass does exactly that). Only the root `<html>` is checked
// for `h-full`, below, because there it is the original defect.
const BANNED_FLOORS = [
  "100svh",
  "100dvh",
  "100lvh",
  "min-h-screen",
  "min-h-dvh",
  "min-h-svh",
  "min-h-full",
];
for (const layout of FLOORED_SURFACES) {
  const source = code(layout);
  assert.match(
    source,
    SLACK_FLOOR,
    `${layout} must floor at the large viewport plus a positive rem margin so the document always clears the (svh, lvh] band`,
  );
  for (const banned of BANNED_FLOORS) {
    assert.ok(
      !source.includes(banned),
      `${layout} must not use ${banned} — it leaves surplus range or tracks the live viewport`,
    );
  }
}

// The rubber band itself. `overscroll-behavior-y: contain` is the wrong value
// and was the direct cause of the reported bottom-of-page bounce: `contain`
// suppresses scroll chaining and pull-to-refresh but explicitly ALLOWS the
// overscroll affordance, i.e. the rubber band. Only `none` removes it. This is
// honored at the document scroller by Android Chrome and desktop Chrome/Edge;
// iOS Safari ignores it at the root regardless of value, so iOS needs the
// surplus-range guard above instead.
const globals = code("app/globals.css");
assert.match(
  globals,
  /overscroll-behavior-y: none/,
  "the document scroller must not permit the rubber-band overscroll affordance",
);
assert.doesNotMatch(
  globals,
  /overscroll-behavior-y: contain/,
  "`contain` still allows the rubber band — it only stops chaining and pull-to-refresh",
);

// The root must not reintroduce the band through percentage heights. On mobile the
// initial containing block is the LARGEST viewport (chrome hidden), so
// `h-full`/`min-h-full` on html/body resolve taller than 100svh and drop the
// document back into (svh, lvh]. Measured: forcing `body { min-height: 125% }`
// on an already-floored shell drove maxScroll from 0 straight back to 211.
// BANNED_FLOORS above already covers both tokens; assert the body specifically so
// the failure names the root rather than a generic ban.
const rootLayout = code("app/layout.tsx");
assert.match(
  rootLayout,
  /<body className="min-h-\[calc\(100vh\+[1-9]\d*rem\)\]/,
  "body must carry the same slack floor as the shells",
);
const htmlTag = /<html[^>]*>/.exec(rootLayout)?.[0] ?? "";
assert.ok(
  htmlTag && !/\bh-full\b/.test(htmlTag),
  "the root <html> must not use a percentage height — it resolves against the large viewport",
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
