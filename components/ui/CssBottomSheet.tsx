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
  resolveSnapIndex,
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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetHeight = useRef(0);
  const activePointer = useRef<number | null>(null);
  const startY = useRef(0);
  const lastY = useRef(0);
  const offsetRef = useRef(0);
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
    const samples = velocitySamples.current;
    const deltaTime = samples.length >= 2
      ? samples[samples.length - 1].time - samples[0].time
      : 0;
    const velocity =
      deltaTime > 0
        ? (samples[samples.length - 1].y - samples[0].y) / deltaTime
        : 0;
    const target = resolveSnapIndex(
      offsetRef.current,
      velocity,
      sheetHeight.current,
    );
    clearDragState();
    if (target === 0) {
      // Lowest snap doubles as a dismiss gesture.
      onClose?.();
      return;
    }
    setSnapIndex(target);
    setSheetOffset(snapTranslate(target, sheetHeight.current));
  }, [clearDragState, onClose]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-then-animate: render off-screen for one frame, then flip `entered` in the next so the CSS transition runs; also reset to the top snap so reopen starts flush
      setMounted(true);
      setSnapIndex(TOP_INDEX);
      setSheetOffset(0);
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }

    resetSheet();
    setEntered(false);
    const timeout = window.setTimeout(() => setMounted(false), SHEET_MS);
    return () => window.clearTimeout(timeout);
  }, [open, resetSheet]);

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
      event.currentTarget.setPointerCapture(event.pointerId);
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
    setSnapIndex(index);
    setSheetOffset(snapTranslate(index, sheetHeight.current));
  };

  if (!mounted) return null;

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 touch-none select-none transform-gpu motion-reduce:transition-none",
        hideAt === "md" ? "md:hidden" : "sm:hidden",
        dragging ? "cursor-grabbing transition-none" : "cursor-grab transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
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