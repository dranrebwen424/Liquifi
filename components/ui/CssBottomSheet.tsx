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
import { clampBottomSheetDrag } from "@/lib/bottom-sheet-drag";

const SHEET_MS = 450;

type CssBottomSheetProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  hideAt?: "sm" | "md";
};

export function CssBottomSheet({ open, children, className, hideAt = "sm" }: CssBottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const activePointer = useRef<number | null>(null);
  const startY = useRef(0);
  const lastY = useRef(0);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const frame = useRef<number | null>(null);
  const scrollTarget = useRef<HTMLElement | null>(null);

  const setSheetOffset = (nextOffset: number): void => {
    offsetRef.current = clampBottomSheetDrag(nextOffset);
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setOffset(offsetRef.current);
    });
  };

  const resetSheet = useCallback((): void => {
    activePointer.current = null;
    scrollTarget.current = null;
    draggingRef.current = false;
    setDragging(false);
    setSheetOffset(0);
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-then-animate: render off-screen for one frame, then flip `entered` in the next so the CSS transition runs
      setMounted(true);
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
        lastY.current = event.clientY;
        return;
      }

      setSheetOffset(step - previousScrollTop);
    } else {
      setSheetOffset(offsetRef.current + step);
    }

    lastY.current = event.clientY;
  };

  const finishDrag = (event?: ReactPointerEvent<HTMLDivElement>): void => {
    if (event && event.pointerId !== activePointer.current) return;
    resetSheet();
  };

  if (!mounted) return null;

  return (
    <div
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
      {children}
    </div>
  );
}
