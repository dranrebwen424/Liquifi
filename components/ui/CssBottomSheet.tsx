"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  TOP_INDEX,
  clampSheetTranslate,
  resolveReleaseTarget,
  snapTranslate,
} from "@/lib/bottom-sheet-drag";

const SHEET_MS = 450;
const VELOCITY_SAMPLES = 5;

type CssBottomSheetProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  hideAt?: "sm" | "md";
  /** Called when the sheet is dismissed by flinging to the lowest snap. */
  onClose?: () => void;
};

export function CssBottomSheet({
  open,
  children,
  className,
  hideAt = "sm",
  onClose,
}: CssBottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapIndex, setSnapIndex] = useState(TOP_INDEX);
  const [springBack, setSpringBack] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetHeight = useRef(0);
  const activePointer = useRef<number | null>(null);
  const startY = useRef(0);
  const lastY = useRef(0);
  const offsetRef = useRef(0);
  const startSnapRef = useRef(TOP_INDEX);
  const draggingRef = useRef(false);
  const frame = useRef<number | null>(null);
  const scrollTarget = useRef<HTMLElement | null>(null);
  const velocitySamples = useRef<Array<{ time: number; y: number }>>([]);

  const setSheetOffset = (nextOffset: number): void => {
    offsetRef.current = clampSheetTranslate(nextOffset, sheetHeight.current);
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setOffset(offsetRef.current);
    });
  };

  // Track content height (≤85dvh via consumer classes) so snap positions stay
  // correct when forms grow or the mobile URL bar collapses.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const measure = (): void => {
      sheetHeight.current = sheet.offsetHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    return () => observer.disconnect();
    // `mounted` (not `[]` or `open`): the sheet isn't in the DOM until the
    // open-effect flips `mounted`, so a mount-only effect would leave
    // sheetHeight at 0 and every settle would resolve to the dismiss snap.
  }, [mounted]);

  // Give every element inside the sheet `touch-action: none` (the root
  // already has `touch-none`, but touch-action is not inherited and Chrome
  // hit-tests drag starts against the touched element). Consumer sheet bodies
  // are `overflow-y-auto` divs with browser-default touch-action, so Chrome
  // claims vertical pans over them and fires `pointercancel` mid-drag — the
  // sheet "moves slightly then snaps back to top". With the browser out of
  // the way, the pointer-move handoff branch below keeps content scrollable
  // via JS. Synthetic `dispatchEvent` tests bypass Chrome's gesture
  // recognizer, so they cannot reproduce this.
  // ponytail: runs once per mount, not on children changes — current bodies
  // are static scrollables; re-walk if a consumer ever swaps scrollables.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    for (const element of Array.from(sheet.querySelectorAll<HTMLElement>("*"))) {
      element.style.touchAction = "none";
    }
  }, [mounted]);

  const clearDragState = useCallback((): void => {
    activePointer.current = null;
    scrollTarget.current = null;
    draggingRef.current = false;
    setDragging(false);
    velocitySamples.current = [];
  }, []);

  const resetSheet = useCallback((): void => {
    clearDragState();
    setSheetOffset(0);
  }, [clearDragState]);

  const settleDrag = useCallback((): void => {
    // A gesture settles exactly once. `pointerup` settles, then
    // `lostpointercapture` (or a re-entrant call from another pointer path)
    // can re-enter here after `clearDragState` nulled `activePointer`.
    // Settling twice re-resolves from the *resting* offset — for a spring
    // back to the mid snap that offset equals the dismiss line, so a slow
    // release from MID would wrongly slide the sheet away. (The old
    // nearest-snap resolve was idempotent at a resting position; the
    // dismiss-line resolve is not.)
    if (activePointer.current === null) return;
    const samples = velocitySamples.current;
    const deltaTime = samples.length >= 2
      ? samples[samples.length - 1].time - samples[0].time
      : 0;
    const velocity =
      deltaTime > 0
        ? (samples[samples.length - 1].y - samples[0].y) / deltaTime
        : 0;
    const target = resolveReleaseTarget(
      offsetRef.current,
      velocity,
      startSnapRef.current,
      sheetHeight.current,
    );
    clearDragState();
    if (target.action === "dismiss") {
      // Fast fling down or a slow drag past the mid line: slide away.
      onClose?.();
      return;
    }
    // Slow release before the mid line: spring back to the snap the
    // gesture started from (fling-up arrives here too, with `spring` false).
    setSpringBack(target.spring);
    setSnapIndex(target.index);
    setSheetOffset(snapTranslate(target.index, sheetHeight.current));
  }, [clearDragState, onClose]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-then-animate: render off-screen first; the layout effect below flips `entered` deterministically so the CSS transition runs on every open
      setMounted(true);
      setSnapIndex(TOP_INDEX);
      setSheetOffset(0);
      setSpringBack(false);
      return;
    }

    resetSheet();
    setEntered(false);
    const timeout = window.setTimeout(() => setMounted(false), SHEET_MS);
    return () => window.clearTimeout(timeout);
  }, [open, resetSheet]);

  // Deterministic entrance: `mounted` commits the sheet at `translate3d(0,
  // 100%, 0)`, and this post-paint effect runs only after that off-screen frame
  // has been painted and laid out (React guarantees effects run post-paint).
  // Flipping `entered` here makes the CSS transition start from a frame the
  // browser has definitely seen. The previous single requestAnimationFrame in
  // the open effect could be batched with `setMounted` into one commit, so the
  // starting frame was never painted and the sheet popped in without sliding.
  useEffect(() => {
    if (!mounted) return;
    void sheetRef.current?.offsetHeight;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-then-animate: the sheet is already painted off-screen; flipping `entered` is the animation trigger, not a cascading render
    setEntered(true);
  }, [mounted]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const findScrollableParent = (
    target: EventTarget | null,
    root: HTMLElement,
  ): HTMLElement | null => {
    let element = target instanceof HTMLElement ? target : null;

    while (element && element !== root) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        element.scrollHeight > element.clientHeight
      ) {
        return element;
      }
      element = element.parentElement;
    }

    return null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // The snap the sheet rests at when the gesture begins — slow drags bounce
    // back here. Current render's state is accurate: pointer events only fire
    // after the latest commit, so `snapIndex` in this closure is the rest.
    startSnapRef.current = snapIndex;
    setSpringBack(false);
    activePointer.current = event.pointerId;
    startY.current = event.clientY;
    lastY.current = event.clientY;
    velocitySamples.current = [{ time: event.timeStamp, y: event.clientY }];
    scrollTarget.current = findScrollableParent(event.target, event.currentTarget);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerId !== activePointer.current) return;

    const totalDelta = event.clientY - startY.current;
    if (!draggingRef.current && Math.abs(totalDelta) < 8) return;

    if (!draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);
      // Explicit capture only for mouse/pen: touch already implicitly captures
      // to the pointerdown target for the whole gesture (moves bubble through
      // the sheet root), and calling setPointerCapture on a touch pointer
      // makes Chrome fire a spurious `lostpointercapture` mid-gesture, which
      // snaps the sheet back to top — the real-device bug.
      if (event.pointerType !== "touch") {
        const target =
          event.target instanceof Element ? event.target : event.currentTarget;
        target.setPointerCapture(event.pointerId);
      }
    }

    const step = event.clientY - lastY.current;
    const scrollable = scrollTarget.current;

    if (scrollable && offsetRef.current === 0) {
      const previousScrollTop = scrollable.scrollTop;
      const nextScrollTop = Math.max(0, previousScrollTop - step);
      scrollable.scrollTop = nextScrollTop;

      if (nextScrollTop > 0 || step < 0) {
        velocitySamples.current.push({ time: event.timeStamp, y: event.clientY });
        if (velocitySamples.current.length > VELOCITY_SAMPLES) {
          velocitySamples.current.shift();
        }
        lastY.current = event.clientY;
        return;
      }

      setSheetOffset(step - previousScrollTop);
    } else {
      setSheetOffset(offsetRef.current + step);
    }

    velocitySamples.current.push({ time: event.timeStamp, y: event.clientY });
    if (velocitySamples.current.length > VELOCITY_SAMPLES) {
      velocitySamples.current.shift();
    }
    lastY.current = event.clientY;
  };

  const finishDrag = (event?: ReactPointerEvent<HTMLDivElement>): void => {
    if (event && event.pointerId !== activePointer.current) return;
    settleDrag();
  };

  const jumpToSnap = (index: number): void => {
    if (index === 0) {
      onClose?.();
      return;
    }
    // Dots jumps use the standard ease, never the spring easing.
    setSpringBack(false);
    setSnapIndex(index);
    setSheetOffset(snapTranslate(index, sheetHeight.current));
  };

  if (!mounted) return null;

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 overscroll-y-contain touch-none select-none transform-gpu motion-reduce:transition-none",
        hideAt === "md" ? "md:hidden" : "sm:hidden",
        dragging ? "cursor-grabbing transition-none" : cn("cursor-grab transition-transform duration-[450ms]", springBack ? "ease-[cubic-bezier(0.34,1.56,0.64,1)]" : "ease-[cubic-bezier(0.22,1,0.36,1)]"),
        className,
      )}
      style={{
        transform: entered
          ? `translate3d(0, ${offset}px, 0)`
          : "translate3d(0, 100%, 0)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={() => finishDrag()}
    >
      <div
        className="absolute right-3 top-3 z-10 flex flex-col gap-1.5"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {[TOP_INDEX, 1, 0].map((index) => (
          <button
            key={index}
            type="button"
            aria-label={index === TOP_INDEX ? "Expand sheet" : index === 0 ? "Close sheet" : "Resize sheet"}
            aria-pressed={snapIndex === index}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              snapIndex === index ? "bg-text-secondary" : "bg-border-strong",
            )}
            onClick={() => jumpToSnap(index)}
          />
        ))}
      </div>
      {children}
    </div>
  );
}