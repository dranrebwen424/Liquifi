export const SNAPS = [0.15, 0.5, 0.92] as const;
export const TOP_INDEX = 2;

const MAX_UPWARD_DRAG = 24;
const FLING_VELOCITY = 0.8; // px/ms

export function snapTranslate(snapIndex: number, sheetHeight: number): number {
  // Top snap rests flush — keeps the scroll-handoff condition (`offset === 0`) exact.
  if (snapIndex === TOP_INDEX) return 0;
  return sheetHeight * (1 - SNAPS[snapIndex]);
}

export function clampSheetTranslate(value: number, sheetHeight: number): number {
  const max = sheetHeight > 0 ? sheetHeight : 320;
  return Math.max(MAX_UPWARD_DRAG * -1, Math.min(value, max));
}

// Rubber-band the top edge: an up-drag that pushes the sheet above the top
// snap is resisted by a diminishing curve (asymptote MAX_UPWARD_DRAG) instead
// of the old hard -24 stop — the further you pull, the harder it resists.
export function elasticOffset(delta: number): number {
  if (delta >= 0) return delta;
  return -MAX_UPWARD_DRAG * (1 - Math.exp(delta / (MAX_UPWARD_DRAG * 2)));
}

// End-of-content nudge: a down-drag past the bottom of the scrollable gives
// the sheet a small resisted nudge (asymptote BOTTOM_NUDGE_MAX) instead of a
// dead zone, so the gesture feels alive. Release still follows the normal
// settle rules — a slow release springs back, a real fling drains to the
// sheet (pull-to-close from the end of content).
export const BOTTOM_NUDGE_MAX = 36;
export function bottomNudge(delta: number): number {
  if (delta <= 0) return 0;
  return BOTTOM_NUDGE_MAX * (1 - Math.exp(-delta / BOTTOM_NUDGE_MAX));
}

// Top-edge rubber band: the first TOP_PULL_BAND px of a pull-down from the
// top of the content is resisted (the sheet lags the finger on a sub-linear
// curve — the "stretch"), then the sheet commits to 1:1. Offset is continuous
// at the seam (topPull(48) === 48); the mild slope change reads as the band
// releasing, the same way a native scroll bounce hands off to the sheet.
export const TOP_PULL_BAND = 48;
export function topPull(delta: number): number {
  if (delta <= 0) return delta;
  if (delta < TOP_PULL_BAND) {
    return TOP_PULL_BAND * Math.pow(delta / TOP_PULL_BAND, 1.25);
  }
  return delta;
}

// Momentum glide: finger release velocity (px/ms, up = negative) decays
// exponentially and drives scrollTop at the opposite rate. Pure math so the
// frame loop stays a thin wrapper.
export const MOMENTUM_TAU = 250; // ms — time constant of the glide
export const MOMENTUM_MIN_VELOCITY = 0.35; // px/ms — slower releases stop dead
export function momentumDecay(velocity: number, elapsedMs: number): number {
  return velocity * Math.exp(-elapsedMs / MOMENTUM_TAU);
}

export type ReleaseTarget =
  | { action: "dismiss" }
  | { action: "snap"; index: number; spring: boolean };

export function resolveReleaseTarget(
  translate: number,
  velocity: number,
  startSnapIndex: number,
  sheetHeight: number,
): ReleaseTarget {
  // Fast flings always win: down -> dismiss, up -> fully open (unchanged).
  if (velocity > FLING_VELOCITY) return { action: "dismiss" };
  if (velocity < -FLING_VELOCITY) {
    return { action: "snap", index: TOP_INDEX, spring: false };
  }
  // Slow release: past the mid line closes, otherwise spring back to the
  // snap the gesture started from. `>=` so releasing exactly at the line
  // counts as "reached a certain down".
  if (translate >= sheetHeight * 0.5) return { action: "dismiss" };
  const start = startSnapIndex > 0 ? startSnapIndex : TOP_INDEX;
  return { action: "snap", index: start, spring: true };
}