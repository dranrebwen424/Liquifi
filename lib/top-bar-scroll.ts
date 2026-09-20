const TOP_EDGE = 16;
const DIRECTION_THRESHOLD = 8;

type TopBarScrollResult = {
  anchorY: number;
  visible: boolean | null;
};

export function resolveTopBarScroll(anchorY: number, currentY: number): TopBarScrollResult {
  if (currentY <= TOP_EDGE) return { anchorY: currentY, visible: true };

  const distance = currentY - anchorY;
  if (Math.abs(distance) < DIRECTION_THRESHOLD) {
    return { anchorY, visible: null };
  }

  return { anchorY: currentY, visible: distance < 0 };
}
