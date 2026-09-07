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