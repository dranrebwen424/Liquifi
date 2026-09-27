"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { isImmersivePage } from "@/lib/event-route";
import { SIDEBAR_COLLAPSED_KEY } from "@/lib/sidebar";
import { cn } from "@/lib/utils";

/**
 * Shared shell that syncs main content padding with the collapsible Sidebar.
 * On mobile: no sidebar offset. On desktop: left padding synced with sidebar.
 * On immersive pages (event/report detail): bottom padding animates from
 * pb-20 → pb-0 (navs slide out).
 *
 * @param mobileBottomNav — when false, skip pb-20 on mobile (no bottom nav present).
 */
export function SidebarShell({ children, mobileBottomNav = true }: { children: React.ReactNode; mobileBottomNav?: boolean }) {
  const pathname = usePathname();

  // Sole writer of the sidebar width — Sidebar used to write it too, from a
  // different effect, with different numbers. The two widths themselves are CSS
  // (app/globals.css); this only picks one, and only when it actually changes,
  // so no mount can re-apply a stale value and reflow the page under the user.
  const applyWidth = useCallback((collapsed: boolean) => {
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) applyWidth(stored === "true");
    } catch { /* ponytail: SSR safe */ }

    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.collapsed === "boolean") {
        applyWidth(detail.collapsed);
      }
    };
    window.addEventListener("sidebar:toggle", onToggle);

    const onStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSED_KEY && e.newValue !== null) {
        applyWidth(e.newValue === "true");
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("sidebar:toggle", onToggle);
      window.removeEventListener("storage", onStorage);
    };
  }, [applyWidth]);

  const eventPage = isImmersivePage(pathname);

  return (
    <main
      className={cn(
        "px-4 pt-6 pb-6 transition-[padding] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] md:px-12 md:pt-8 md:pb-8 lg:pl-[calc(var(--sidebar-width)+48px)]",
        eventPage
          ? "pt-0 pb-0 md:pt-0"
          : mobileBottomNav ? "pb-20 md:pb-0" : "pb-6 md:pb-0",
      )}
    >
      {children}
    </main>
  );
}
