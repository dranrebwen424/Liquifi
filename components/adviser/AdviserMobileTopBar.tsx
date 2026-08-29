"use client";

import { usePathname } from "next/navigation";
import { isImmersivePage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

export function AdviserMobileTopBar() {
  const pathname = usePathname();
  const hidden = isImmersivePage(pathname);

  return (
    <div
      className={cn(
        "flex h-16 items-center gap-2 border-b border-border bg-surface px-4 transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:hidden",
        hidden ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
      )}
    >
      <svg className="h-8 w-8 text-accent" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path
          d="M10 22V10l6 6 6-6v12"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-bold text-text-primary">Liquifi</span>
      <span className="ml-auto rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
        Adviser
      </span>
    </div>
  );
}
