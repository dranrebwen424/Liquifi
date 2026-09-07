"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }

    setEntered(false);
    const timeout = window.setTimeout(() => setMounted(false), SHEET_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 transform-gpu transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        hideAt === "md" ? "md:hidden" : "sm:hidden",
        entered ? "translate-y-0" : "translate-y-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
