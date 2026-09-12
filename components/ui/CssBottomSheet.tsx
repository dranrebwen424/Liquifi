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
const SHEET_EASE = "cubic-bezier(0.22,1,0.36,1)";
const SHEET_SPRING_EASE = "cubic-bezier(0.34,1.56,0.64,1)";
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
  // Render-time translate (px). `null` means "first frame off-screen: 100%".
  // Drag moves write the transform imperatively (no React renders on move, so
  // the finger is never a frame behind); settle/close sync this state to the
  // current offset first, then animate via state commits so the CSS transition
  // always runs between two rendered states.
  const [sheetTranslate, setSheetTranslate] = useState<number | null>(null);
  const [snapIndex, setSnapIndex] = useState(TOP_INDEX);
  const [springBack, setSpringBack] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetHeight = useRef(0);
  const activePointer = useRef<number | null>(null);
  const startY = useRef(0);
  const lastY = useRef(0);
  const rawOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const startSnapRef = useRef(TOP_INDEX);
  const draggingRef = useRef(false);
  const scrollTarget = useRef<HTMLElement | null>(null);
  const velocitySamples = useRef<Array<{ time: number; y: number }>>([]);
  // Gesture-scoped: how much of the current top-pull has been accumulated so
  // the rubber band shapes the TOTAL pull, not each move.
  const topPullAccum = useRef(0);
  const bottomPullAccum = useRef(0);
  const bottomPullElement = useRef<HTMLElement | null>(null);
  const bottomPullTimeout = useRef<number | null>(null);
  const sheetSettleTimeout = useRef<number | null>(null);
  const sheetSettleFrame = useRef<number | null>(null);
  // Momentum: frame + target of the post-release glide (null while idle).
  const momentumFrame = useRef<number | null>(null);
  const momentumScrollable = useRef<HTMLElement | null>(null);

  const setSheetTransition = useCallback((transition: string): void => {
    sheetRef.current?.style.setProperty("transition", transition);
  }, []);

  const cancelSheetAnimation = useCallback((): void => {
    if (sheetSettleTimeout.current !== null) {
      window.clearTimeout(sheetSettleTimeout.current);
      sheetSettleTimeout.current = null;
    }
    if (sheetSettleFrame.current !== null) {
      cancelAnimationFrame(sheetSettleFrame.current);
      sheetSettleFrame.current = null;
    }
  }, []);

  const setCursor = useCallback((grabbing: boolean): void => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.classList.toggle("cursor-grabbing", grabbing);
    sheet.classList.toggle("cursor-grab", !grabbing);
  }, []);

  const setSheetOffset = useCallback((nextOffset: number): void => {
    // An up-drag past the top snap is rubber-banded (elastic) rather than
    // hard-clamped. Settle only ever writes non-negative snap targets, so
    // only live drags end up negative here.
    rawOffsetRef.current = nextOffset;
    const shaped = nextOffset < 0 ? elasticOffset(nextOffset) : nextOffset;
    offsetRef.current = clampSheetTranslate(shaped, sheetHeight.current);
    // Pointer-move transforms bypass React state. React renders were one
    // pointer event behind on real drags; a direct transform write stays on the
    // compositor and tracks the finger immediately. The rendered state is
    // synced back to this offset at settle time (see animateSheetTo).
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translate3d(0, ${offsetRef.current}px, 0)`;
    }
  }, []);

  const animateSheetTo = useCallback((
    targetOffset: number,
    easing: string,
    onDone?: () => void,
  ): void => {
    const sheet = sheetRef.current;
    const from = offsetRef.current;
    if (!sheet || Math.abs(from - targetOffset) < 0.5) {
      setSheetTranslate(targetOffset);
      onDone?.();
      return;
    }

    cancelSheetAnimation();
    // Sync the rendered state to where the finger left the sheet before any
    // re-render (a parent `onClose` render committing a stale 0 would yank the
    // sheet back to the top). Then the next frames transition between two
    // state-rendered values, which Chrome animates reliably.
    setSheetTranslate(from);
    setSheetTransition(`transform ${SHEET_MS}ms ${easing}`);
    sheetSettleFrame.current = requestAnimationFrame(() => {
      sheetSettleFrame.current = null;
      setSheetTranslate(targetOffset);
    });
    sheetSettleTimeout.current = window.setTimeout(() => {
      sheetSettleTimeout.current = null;
      onDone?.();
    }, SHEET_MS);
  }, [cancelSheetAnimation, setSheetTransition]);

  const bottomPullTarget = (scrollable: HTMLElement): HTMLElement => {
    const first = scrollable.firstElementChild;
    return first instanceof HTMLElement ? first : scrollable;
  };

  const setBottomPull = (element: HTMLElement, pull: number): void => {
    if (bottomPullTimeout.current !== null) {
      window.clearTimeout(bottomPullTimeout.current);
      bottomPullTimeout.current = null;
    }
    bottomPullElement.current = element;
    element.style.transition = "none";
    element.style.transform = pull > 0 ? `translate3d(0, ${-pull}px, 0)` : "";
  };

  const resetBottomPull = useCallback((spring: boolean): void => {
    const element = bottomPullElement.current;
    bottomPullAccum.current = 0;
    if (bottomPullTimeout.current !== null) {
      window.clearTimeout(bottomPullTimeout.current);
      bottomPullTimeout.current = null;
    }
    if (!element) return;

    if (!spring) {
      element.style.transition = "";
      element.style.transform = "";
      bottomPullElement.current = null;
      return;
    }

    element.style.transition = `transform 260ms ${SHEET_SPRING_EASE}`;
    element.style.transform = "";
    bottomPullTimeout.current = window.setTimeout(() => {
      element.style.transition = "";
      if (bottomPullElement.current === element) bottomPullElement.current = null;
      bottomPullTimeout.current = null;
    }, 260);
  }, []);

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
    setCursor(false);
    velocitySamples.current = [];
    rawOffsetRef.current = 0;
    topPullAccum.current = 0;
    bottomPullAccum.current = 0;
  }, [setCursor]);

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
    resetBottomPull(true);
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
        animateSheetTo(0, SHEET_EASE);
        return;
      }
      // Fast fling down or a slow drag past the mid line: slide away. Sync
      // the rendered state to where the finger left the sheet BEFORE the
      // parent `onClose` re-render commits — a stale 0 render would yank the
      // sheet back to the top before the exit slide.
      setSheetTranslate(offsetRef.current);
      onClose?.();
      return;
    }
    // Slow release before the mid line: spring back to the snap the
    // gesture started from (fling-up arrives here too, with `spring` false).
    setSpringBack(target.spring);
    setSnapIndex(target.index);
    animateSheetTo(
      snapTranslate(target.index, sheetHeight.current),
      target.spring ? SHEET_SPRING_EASE : SHEET_EASE,
    );
  }, [animateSheetTo, clearDragState, onClose, resetBottomPull, startMomentum]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-then-animate: render off-screen first; the post-paint effect commits `sheetTranslate` to 0 so the CSS transition runs on every open, and reopening from a closed offset (height px) must start off-screen again
      setMounted(true);
      setSheetTranslate(null);
      setSnapIndex(TOP_INDEX);
      setSpringBack(false);
      return;
    }

    animateSheetTo(sheetHeight.current || sheetRef.current?.offsetHeight || 320, SHEET_EASE, () => {
      setMounted(false);
      resetBottomPull(false);
      clearDragState();
      rawOffsetRef.current = 0;
      offsetRef.current = 0;
    });
    return cancelSheetAnimation;
  }, [animateSheetTo, cancelSheetAnimation, clearDragState, open, resetBottomPull, setSheetOffset, setSheetTransition]);

  // Deterministic entrance: `mounted` + `sheetTranslate: null` commits the sheet
  // at `translate3d(0, 100%, 0)`, and this post-paint effect runs only after
  // that off-screen frame has been painted and laid out (React guarantees
  // effects run post-paint). Committing `sheetTranslate` to 0 here makes the
  // CSS transition start from a frame the browser has definitely seen — the
  // previous single requestAnimationFrame in the open effect could be batched
  // with `setMounted` into one commit, so the starting frame was never painted
  // and the sheet popped in without sliding.
  useEffect(() => {
    if (!mounted) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheetHeight.current = sheet.offsetHeight;
    setSheetTransition(`transform ${SHEET_MS}ms ${SHEET_EASE}`);
    // mount-then-animate: the sheet is already painted off-screen; committing
    // `sheetTranslate` is the animation trigger, not a cascading render
    setSheetTranslate(0);
  }, [mounted, setSheetTransition]);

  useEffect(() => () => {
    cancelSheetAnimation();
    if (momentumFrame.current !== null) cancelAnimationFrame(momentumFrame.current);
    if (bottomPullTimeout.current !== null) window.clearTimeout(bottomPullTimeout.current);
    momentumScrollable.current = null;
  }, [cancelSheetAnimation]);

  const findScrollableParent = (
    target: EventTarget | null,
    root: HTMLElement,
  ): HTMLElement | null => {
    let element = target instanceof HTMLElement ? target : null;
    let fallback: HTMLElement | null = null;

    while (element && element !== root) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        fallback ??= element;
        if (element.scrollHeight > element.clientHeight) return element;
      }
      element = element.parentElement;
    }

    return fallback;
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
    cancelSheetAnimation();
    resetBottomPull(false);
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
      setSheetTransition("none");
    }

    const step = event.clientY - lastY.current;
    const scrollable = scrollTarget.current;

    if (scrollable && offsetRef.current === 0) {
      const previousScrollTop = scrollable.scrollTop;
      const maxScrollTop = Math.max(0, scrollable.scrollHeight - scrollable.clientHeight);

      if (bottomPullAccum.current > 0 && step > 0) {
        bottomPullAccum.current = Math.max(0, bottomPullAccum.current - step);
        setBottomPull(bottomPullTarget(scrollable), bottomNudge(bottomPullAccum.current));
        velocitySamples.current.push({ time: event.timeStamp, y: event.clientY });
        if (velocitySamples.current.length > VELOCITY_SAMPLES) {
          velocitySamples.current.shift();
        }
        lastY.current = event.clientY;
        return;
      }

      const rawNextScrollTop = previousScrollTop - step;
      const nextScrollTop = Math.max(0, Math.min(rawNextScrollTop, maxScrollTop));
      scrollable.scrollTop = nextScrollTop;

      if (rawNextScrollTop > maxScrollTop && step < 0) {
        topPullAccum.current = 0;
        bottomPullAccum.current += rawNextScrollTop - maxScrollTop;
        setBottomPull(bottomPullTarget(scrollable), bottomNudge(bottomPullAccum.current));
        velocitySamples.current.push({ time: event.timeStamp, y: event.clientY });
        if (velocitySamples.current.length > VELOCITY_SAMPLES) {
          velocitySamples.current.shift();
        }
        lastY.current = event.clientY;
        return;
      }

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
      // Sheet off 0 with a scrollable engaged — content is pinned at the top;
      // continue the rubber band on total finger travel. topPull is identity
      // past the band, so the seam is continuous.
      topPullAccum.current += step;
      setSheetOffset(topPull(topPullAccum.current));
    } else {
      setSheetOffset(rawOffsetRef.current + step);
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
        cn("cursor-grab transition-transform duration-[450ms]", springBack ? "ease-[cubic-bezier(0.34,1.56,0.64,1)]" : "ease-[cubic-bezier(0.22,1,0.36,1)]"),
        className,
      )}
      style={{
        transform:
          sheetTranslate === null
            ? "translate3d(0, 100%, 0)"
            : `translate3d(0, ${sheetTranslate}px, 0)`,
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
