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
  MOMENTUM_MIN_VELOCITY,
  TOP_INDEX,
  bottomNudge,
  clampSheetTranslate,
  elasticOffset,
  momentumDecay,
  resolveReleaseTarget,
  snapTranslate,
  topPull,
} from "@/lib/bottom-sheet-drag";

const SHEET_MS = 450;
const VELOCITY_SAMPLES = 5;
// A sheet only dismisses once it has genuinely been dragged this far. A fast
// down-gesture that just scrolls the content (ending while the sheet is still
// at the top) must snap back, never swipe the sheet away.
const MIN_SHEET_DRAG = 4;

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
  // Gesture-scoped: how much of the current top-pull has been accumulated so
  // the rubber band shapes the TOTAL pull, not each move.
  const topPullAccum = useRef(0);
  // Momentum: frame + target of the post-release glide (null while idle).
  const momentumFrame = useRef<number | null>(null);
  const momentumScrollable = useRef<HTMLElement | null>(null);

  const setSheetOffset = (nextOffset: number): void => {
    // An up-drag past the top snap is rubber-banded (elastic) rather than
    // hard-clamped. Settle only ever writes non-negative snap targets, so
    // only live drags end up negative here.
    const shaped = nextOffset < 0 ? elasticOffset(nextOffset) : nextOffset;
    offsetRef.current = clampSheetTranslate(shaped, sheetHeight.current);
    // Write synchronously. A rAF-guarded version once coalesced rapid moves,
    // but a frame scheduled here could be cancelled by React's effect
    // teardown before it ran, leaving `frame.current` permanently non-null and
    // wedging the live drag (the sheet stopped tracking the finger). React
    // batches the setState fine on its own; the coalescing buy was not worth
    // the wedge. ponytail: if a drag ever needs per-frame coalescing, guard
    // with a timestamp-last-commit instead of a rAF id.
    setOffset(offsetRef.current);
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
    topPullAccum.current = 0;
  }, []);

  const resetSheet = useCallback((): void => {
    clearDragState();
    setSheetOffset(0);
  }, [clearDragState]);

  // Post-release inertia for the JS-driven scroll (the whole sheet subtree is
  // touch-action: none, so the browser never animates a glide itself). A
  // release that ended as a pure content scroll decays the finger velocity
  // into scrollTop — finger up moves content up — and stops at rest or an
  // edge. A new pointerdown cancels it.
  const startMomentum = useCallback(
    (scrollable: HTMLElement | null, velocity: number): void => {
      if (momentumFrame.current !== null) {
        cancelAnimationFrame(momentumFrame.current);
        momentumFrame.current = null;
      }
      momentumScrollable.current = null;
      if (!scrollable || Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) return;
      momentumScrollable.current = scrollable;
      let v = velocity;
      let previousNow = performance.now();
      const tick = (now: number): void => {
        const element = momentumScrollable.current;
        if (!element) {
          momentumFrame.current = null;
          return;
        }
        const dt = Math.min(32, now - previousNow);
        previousNow = now;
        v = momentumDecay(v, dt);
        const stepPx = -v * dt;
        if (stepPx === 0 || Math.abs(v) < 0.03) {
          momentumFrame.current = null;
          momentumScrollable.current = null;
          return;
        }
        const nextScrollTop = element.scrollTop + stepPx;
        const maxScrollTop = element.scrollHeight - element.clientHeight;
        if (nextScrollTop <= 0) {
          element.scrollTop = 0;
          momentumFrame.current = null;
          momentumScrollable.current = null;
          return;
        }
        if (nextScrollTop >= maxScrollTop) {
          element.scrollTop = maxScrollTop;
          momentumFrame.current = null;
          momentumScrollable.current = null;
          return;
        }
        element.scrollTop = nextScrollTop;
        momentumFrame.current = requestAnimationFrame(tick);
      };
      momentumFrame.current = requestAnimationFrame(tick);
    },
    [],
  );

  const settleDrag = useCallback((allowMomentum: boolean): void => {
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
    const scrollable = scrollTarget.current;
    const wasPureScroll =
      scrollable !== null && offsetRef.current <= MIN_SHEET_DRAG;
    clearDragState();
    // Release that ended as a real content scroll (the sheet never left the
    // top): glide the content instead of dead-stopping. Works alongside the
    // sheet resolve below — fling slows the list; the sheet springs to rest.
    if (allowMomentum) {
      startMomentum(wasPureScroll ? scrollable : null, velocity);
    }
    if (target.action === "dismiss") {
      // A dismiss must be a real swipe of the sheet. A sudden down-gesture
      // that was consumed by scrolling content (so the sheet never left the
      // top) should never close it — that is a scroll, not a swipe-away.
      // This stops a fling over scrolled content from dismissing the sheet
      // while it sits fully open with no slide.
      if (offsetRef.current <= MIN_SHEET_DRAG) {
        setSpringBack(false);
        setSnapIndex(TOP_INDEX);
        setSheetOffset(0);
        return;
      }
      // Fast fling down or a slow drag past the mid line: slide away.
      onClose?.();
      return;
    }
    // Slow release before the mid line: spring back to the snap the
    // gesture started from (fling-up arrives here too, with `spring` false).
    setSpringBack(target.spring);
    setSnapIndex(target.index);
    setSheetOffset(snapTranslate(target.index, sheetHeight.current));
  }, [clearDragState, onClose, startMomentum]);

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
    if (momentumFrame.current !== null) cancelAnimationFrame(momentumFrame.current);
    momentumScrollable.current = null;
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
    // A new touch stops any glide in flight; the next gesture starts with a
    // fresh rubber-band budget.
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = null;
    }
    momentumScrollable.current = null;
    topPullAccum.current = 0;
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

      // Content is at its end and the finger keeps pulling down: this is
      // neither a content scroll (a down-pull at the bottom should read as
      // pull-to-close, not scroll-back) nor a free sheet drag yet — answer
      // with a resisted nudge instead, and leave the content where it is.
      const atEnd =
        previousScrollTop + scrollable.clientHeight >=
        scrollable.scrollHeight - 1;
      if (step > 0 && atEnd) {
        setSheetOffset(bottomNudge(step));
        velocitySamples.current.push({ time: event.timeStamp, y: event.clientY });
        if (velocitySamples.current.length > VELOCITY_SAMPLES) {
          velocitySamples.current.shift();
        }
        lastY.current = event.clientY;
        return;
      }

      const nextScrollTop = Math.max(0, previousScrollTop - step);
      scrollable.scrollTop = nextScrollTop;

      if (nextScrollTop > 0 || step < 0) {
        // Content absorbed the move again — any prior rubber-band pull is
        // spent, so the next top-engagement re-bands from scratch.
        topPullAccum.current = 0;
        velocitySamples.current.push({ time: event.timeStamp, y: event.clientY });
        if (velocitySamples.current.length > VELOCITY_SAMPLES) {
          velocitySamples.current.shift();
        }
        lastY.current = event.clientY;
        return;
      }

      // Content hit the top: the leftover pull belongs to the sheet. The
      // first TOP_PULL_BAND px are rubber-banded (the sheet lags the finger —
      // the stretch), then it commits to 1:1.
      const leftover = step - previousScrollTop;
      topPullAccum.current += leftover;
      setSheetOffset(topPull(topPullAccum.current));
    } else if (scrollable) {
      // Sheet off 0 with a scrollable engaged — content is pinned at an
      // edge; continue the resistance curve that started the pull.
      const sc = scrollable;
      if (sc.scrollTop <= 0) {
        // Content pinned at the TOP: keep the rubber band on total finger
        // travel until TOP_PULL_BAND spends itself, then 1:1 — topPull is
        // identity past the band, so the seam is continuous.
        topPullAccum.current += step;
        setSheetOffset(topPull(topPullAccum.current));
      } else if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1) {
        // Content pinned at the END (pull-to-close gesture): continue the
        // resisted nudge on the accumulating offset — monotone, bounded, no
        // hand-off to the top band.
        setSheetOffset(bottomNudge(offsetRef.current + step));
      } else {
        setSheetOffset(offsetRef.current + step);
      }
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
    // Momentum only from a clean pointer-up; cancel/lost-capture (gesture
    // interrupted, or a second settle pass) stops dead instead of gliding.
    settleDrag(event !== undefined && event.type === "pointerup");
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
      {children}
    </div>
  );
}