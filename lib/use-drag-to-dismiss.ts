"use client";

// Native bottom-sheet drag-to-dismiss. Entrance/exit live in CssBottomSheet;
// this hook only owns finger-follow and snap-back, so no Framer transform can
// compete with the sheet animation.
//
// The sheet follows your finger while you hold it and never retracts under it;
// on release it snaps back (y=0) or dismisses if pulled far enough. Because we
// only pointer-capture AFTER the gesture travels ~8px, a plain tap still lands
// on the button under your finger (content stays clickable after a bounce).
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const DISMISS_DISTANCE = 120; // px pulled down before release dismisses
const DRAG_START = 8; // px of travel before a touch becomes a drag (not a tap)

export function useDragToDismiss(onDismiss: () => void) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [y, setY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const dragY = useRef(0);
  const activePointer = useRef<number | null>(null);
  const dragging = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    activePointer.current = e.pointerId;
    dragging.current = false;
    setIsDragging(false);
    startY.current = dragY.current = e.clientY;
    // No setPointerCapture here: we don't want a plain tap captured (it would
    // swallow the button's click). Only after travel past DRAG_START do we grab.
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointer.current) return;
    const delta = Math.max(0, e.clientY - startY.current);
    if (!dragging.current && delta < DRAG_START) return; // still a potential tap
    if (!dragging.current) {
      dragging.current = true;
      setIsDragging(true);
      // Now it's a real drag — capture so movement stays tracked even if the
      // finger leaves the sheet. Taps already cleared DRAG_START untouched.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* capture can throw if the pointer already left — ignore */
      }
    }
    dragY.current = e.clientY;
    setY(delta);
  };

  const endDrag = () => {
    if (!dragging.current) {
      activePointer.current = null;
      return;
    }
    dragging.current = false;
    setIsDragging(false);
    activePointer.current = null;
    const delta = Math.max(0, dragY.current - startY.current);
    if (delta > DISMISS_DISTANCE) {
      onDismiss();
      // The modal persists across open/close (only the sheet subtree toggles),
      // so the hook's `y` state survives a close. If we don't reset it here, the
      // next open renders the sheet mid-drag (only the top part visible, never
      // sliding all the way up). Reset to origin so the next open starts fresh.
      setY(0);
      startY.current = dragY.current = 0;
    } else {
      setY(0);
    }
  };

  const style: CSSProperties = {
    transform: `translateY(${y}px)`,
    transition: isDragging
      ? "none"
      : "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
  };

  return {
    wrapRef,
    style,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
