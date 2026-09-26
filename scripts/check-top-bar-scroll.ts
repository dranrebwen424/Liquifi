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

// ---------------------------------------------------------------------------
// SCOPE — read before adding to this file.
//
// This script CANNOT test the reported bottom-of-page jolt, and three previous
// versions of it pretended otherwise. Each asserted a specific viewport floor
// (`125vh`, then `100svh`, then `100vh + 6rem`); each passed while the phone
// still jolted, because none of them were the cause. Asserting an
// implementation is worse than asserting nothing: it manufactures confidence and
// then locks the wrong workaround in place. Do not add floor/unit assertions here.
//
// The jolt is Chrome adjusting scroll position as its toolbar collapses, which
// shortens the available scroll range by the toolbar height. Any page that is
// scrollable at rest is subject to it near its bottom edge. No CSS value avoids
// it; the only jolt-free page is one that is not scrollable. That is a property
// of the content, not of the stylesheet, so it can only be checked on a device.
//
// What remains below are the two CSS-level mistakes that are objectively wrong
// and cheap to reintroduce.
// ---------------------------------------------------------------------------

// Direction hysteresis for the auto-hide bars. Pure function, real assertions.
assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });

// Boundary detection, so an elastic spring-back at the document end is never
// mistaken for a scroll-up intent and re-extends the bar.
assert.equal(isAtScrollBoundary(0, 800, 3000), true, "top edge is a boundary");
assert.equal(isAtScrollBoundary(500, 800, 3000), false, "mid page is not a boundary");
assert.equal(isAtScrollBoundary(2190, 800, 3000), false, "just short of the end is still scrollable");
assert.equal(isAtScrollBoundary(2200, 800, 3000), true, "flush with the end is a boundary");
assert.equal(isAtScrollBoundary(2260, 800, 3000), true, "overscrolled past the end is a boundary");
assert.equal(isAtScrollBoundary(2210, 800, 3000), true, "mid spring-back is a boundary");

// 1. The rubber-band affordance must be off. `overscroll-behavior-y: contain` is
// the trap: per spec it suppresses scroll chaining and pull-to-refresh but
// explicitly ALLOWS the overscroll affordance — the rubber band. Only `none`
// removes it. Honored at the document scroller by Android Chrome and desktop
// Chrome/Edge; iOS Safari ignores it at the root at any value.
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

// 2. No viewport-relative height on the root or the page shells. Two reasons,
// both measured: a `vh`-based floor forces every page to be scrollable by its own
// margin (96px of dead scroll on desktop, where 100vh *is* the viewport), and a
// percentage height on the root resolves against the largest viewport, which is
// how `html h-full` + `body min-h-full` conjured a phantom page height in the
// first place. Nothing needs one — the background propagates to the canvas, so a
// short page still paints full-screen.
//
// Viewport units are banned in these files outright. Percentage heights are
// banned only on the root: `h-full` on an inner card filling its grid track is
// legitimate and unrelated (the landing `cardClass` does exactly that).
const NO_VIEWPORT_FLOOR = [
  "app/layout.tsx",
  "app/admin/layout.tsx",
  "app/adviser/layout.tsx",
  "app/treasurer/layout.tsx",
  "app/preview-dept/page.tsx",
  "app/page.tsx",
];
const VIEWPORT_FLOOR =
  /\b(?:min-h|h)-(?:screen|dvh|svh|lvh)\b|\[[^\]]*\d*(?:d|s|l)?vh[^\]]*\]/;
for (const file of NO_VIEWPORT_FLOOR) {
  assert.doesNotMatch(
    code(file),
    VIEWPORT_FLOOR,
    `${file} must not set a viewport height — it forces dead scroll and cannot affect the toolbar jolt`,
  );
}
const rootLayout = code("app/layout.tsx");
for (const percentage of ["h-full", "min-h-full"]) {
  assert.ok(
    !rootLayout.includes(percentage),
    `the root must not use ${percentage} — it resolves against the large viewport and invents page height`,
  );
}

// 3. AuthShell is the single exception: `items-center` needs something to center
// against, so it fills the smallest viewport. `svh` is the only correct unit —
// it equals the resting viewport, so the document is never scrollable. `vh` would
// add the toolbar height as scroll range and `dvh` would resize the document
// mid-animation. Guard the unit rather than the value, so the margin is free.
const authShell = code("components/auth/AuthShell.tsx");
assert.match(
  authShell,
  /min-h-svh\b/,
  "AuthShell must fill the smallest viewport so a short form centers without scrolling",
);
assert.doesNotMatch(
  authShell,
  /min-h-(?:screen|dvh|full)\b|\[\d*(?:d|l)?vh\]/,
  "AuthShell must not use a unit that adds scroll range or resizes mid-animation",
);

console.log("top bar scroll check: all assertions passed");
