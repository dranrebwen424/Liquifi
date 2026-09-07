const MAX_UPWARD_DRAG = 24;
const MAX_DOWNWARD_DRAG = 320;

export function clampBottomSheetDrag(delta: number): number {
  return Math.max(MAX_UPWARD_DRAG * -1, Math.min(delta, MAX_DOWNWARD_DRAG));
}
