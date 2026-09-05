"use client";

// Native bottom-sheet drag-to-dismiss — owns the sheet's vertical position
// entirely (entrance slide-up + drag + bounce-back + dismiss) so framer
// never runs a competing transform animation that can freeze mid-slide.
//
// The sheet follows your finger while you hold it and never retracts under it;
// on release it snaps back (y=0) or dismisses if pulled far enough. Because we
// only pointer-capture AFTER the gesture travels ~8px, a plain tap still lands
// on the button under your finger (content stays clickable after a bounce).
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";

const DISMISS_DISTANCE = 120; // px pulled down before release dismisses
const DRAG_START = 8; // px of travel before a touch becomes a drag (not a tap)

export function useDragToDismiss(onDismiss: () => void) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [y, setY] = useState(0);
  const startY = useRef(0);
  const dragY = useRef(0);
  const activePointer = useRef<number | null>(null);
  const dragging = useRef(false);
  const anim = useRef<AnimationPlaybackControls | null>(null);

  const stopAnim = () => {
    anim.current?.stop();
    anim.current = null;
  };

  // Entrance is handled by framer on the OUTER motion.div (slide up), so the
  // hook owns drag + bounce + dismiss only. `y` stays 0 until a real drag, which
  // never happens during the entrance — nothing competes, nothing freezes.

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopAnim(); // a new grab cancels any in-flight bounce/entrance
    activePointer.current = e.pointerId;
    dragging.current = false;
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
    if (!dragging.current) return;
    dragging.current = false;
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
      // Snap back to origin — one-shot, content clickable immediately after.
      anim.current = animate(delta, 0, {
        onUpdate: (v) => setY(v),
        duration: 0.25,
        ease: "easeOut",
      });
    }
  };

  return {
    wrapRef,
    y,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}