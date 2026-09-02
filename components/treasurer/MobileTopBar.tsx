"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bell, Search } from "lucide-react";
import { isImmersivePage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

type Props = {
  onOpenSidebar?: () => void;
};

export function MobileTopBar({ onOpenSidebar }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearching = searchParams.get("search") === "1";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hidden = isImmersivePage(pathname);

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
        "flex h-14 items-center gap-2 bg-background px-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:hidden",
        hidden ? "h-0 -translate-y-full opacity-0 pointer-events-none overflow-hidden" : "translate-y-0 opacity-100",
      )}>
        <button
          type="button"
          onClick={exitSearch}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary"
          aria-label="Exit search"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <input
          type="text"
          placeholder="Search events..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    );
  }

  // ── Default: hamburger + search bar + bell ──
  return (
    <div className={cn(
      "flex h-14 items-center gap-3 bg-background px-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:hidden",
      hidden ? "h-0 -translate-y-full opacity-0 pointer-events-none overflow-hidden" : "translate-y-0 opacity-100",
    )}>
      {/* Hamburger */}
      {onOpenSidebar && (
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
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
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Search Events</span>
      </button>

      {/* Bell / notifications */}
      <Link
        href="/treasurer/notifications"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </Link>
    </div>
  );
}
