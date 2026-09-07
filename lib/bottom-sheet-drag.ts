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

export function resolveSnapIndex(
  translate: number,
  velocity: number,
  sheetHeight: number,
): number {
  if (velocity > FLING_VELOCITY) return 0; // fast downward flick -> dismiss snap
  if (velocity < -FLING_VELOCITY) return TOP_INDEX; // fast upward flick -> full

  // velocity only gates the two fling branches above; the settle is pure
  // nearest-snap (a per-candidate bias term would cancel out).
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < SNAPS.length; index++) {
    const distance = Math.abs(translate - snapTranslate(index, sheetHeight));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}