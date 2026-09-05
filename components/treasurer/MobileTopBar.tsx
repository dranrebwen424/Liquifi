"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bell, Search } from "lucide-react";
import { isImmersivePage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

type Props = {
  onOpenSidebar?: () => void;
  unreadCount?: number;
};

export function MobileTopBar({ onOpenSidebar, unreadCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearching = searchParams.get("search") === "1";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hidden = isImmersivePage(pathname);

  // Hide on scroll down, reappear on scroll up. Translate-only (no height
  // collapse) so it tracks the flow and never causes layout/scroll feedback.
  const [scrolledDown, setScrolledDown] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y <= lastY.current) {
          setScrolledDown(false); // up or at top -> show
        } else if (y > 72) {
          setScrolledDown(true); // clearly scrolled down -> hide
        }
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const collapsed = hidden || scrolledDown;

  // ponytail: debounce URL sync so router.replace doesn't fire on every keystroke
  useEffect(() => {
    if (!isSearching) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = new URLSearchParams();
      sp.set("search", "1");
      if (query) sp.set("q", query);
      router.replace(`?${sp.toString()}`, { scroll: false });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isSearching]); // eslint-disable-line react-hooks/exhaustive-deps

  const exitSearch = () => {
    router.replace("/treasurer/home");
  };

  const enterSearch = () => {
    router.push("?search=1");
  };

  // ── Search active: back arrow + input ──
  if (isSearching) {
    return (
      <div className={cn(
        "flex h-16 items-center gap-2 bg-background px-4 lg:hidden",
        hidden ? "hidden" : cn("sticky top-0 z-40 transition-transform duration-300 ease-out", collapsed ? "-translate-y-full" : "translate-y-0"),
      )}>
        <button
          type="button"
          onClick={exitSearch}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary"
          aria-label="Exit search"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <input
          type="text"
          placeholder="Search events..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    );
  }

  // ── Default: hamburger + search bar + bell ──
  return (
    <div className={cn(
      "flex h-16 items-center gap-3 bg-background px-4 lg:hidden",
      hidden ? "hidden" : cn("sticky top-0 z-40 transition-transform duration-300 ease-out", collapsed ? "-translate-y-full" : "translate-y-0"),
    )}>
      {/* Hamburger */}
      {onOpenSidebar && (
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Search bar — clickable, navigates to search mode */}
      <button
        type="button"
        onClick={enterSearch}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-base text-text-muted transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <Search className="h-5 w-5 shrink-0" />
        <span>Search Events</span>
      </button>

      {/* Bell / notifications */}
      <Link
        href="/treasurer/notifications"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-error-foreground ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
