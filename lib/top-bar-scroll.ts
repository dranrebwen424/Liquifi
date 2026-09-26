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

/**
 * True while the page sits flush against either scroll boundary.
 *
 * A fast flick that reaches the end produces an elastic spring-back, which the
 * browser reports as a large upward delta in scrollY. That is not the user
 * scrolling up, so the bar must ignore it — otherwise the bar re-extends on
 * every bounce and layers a 200-300ms transform on top of the bounce, which is
 * what reads as vibration. Freezing here is one frame of grace: a real upward
 * scroll leaves the boundary immediately and the bar reappears on the next
 * qualifying frame.
 */
export function isAtScrollBoundary(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
): boolean {
  return scrollY <= TOP_EDGE || scrollY + viewportHeight >= scrollHeight - 1;
}
