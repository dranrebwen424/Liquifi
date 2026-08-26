"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { isEventPage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

export function MobileTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearching = searchParams.get("search") === "1";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hidden = isEventPage(pathname);

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

  const enterSearch = () => {
    router.push("?search=1");
  };

  const exitSearch = () => {
    router.replace("/treasurer/home");
  };

  const updateQuery = (value: string) => {
    setQuery(value);
  };

  if (isSearching) {
    return (
      <div className={cn(
        "flex h-16 items-center gap-2 border-b border-border bg-background px-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:hidden",
        hidden ? "h-0 -translate-y-full opacity-0 pointer-events-none overflow-hidden border-b-0" : "translate-y-0 opacity-100",
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
          onChange={(e) => updateQuery(e.target.value)}
          autoFocus
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-16 items-center gap-2 border-b border-border bg-surface px-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:hidden",
      hidden ? "h-0 -translate-y-full opacity-0 pointer-events-none overflow-hidden border-b-0" : "translate-y-0 opacity-100",
    )}>
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
      <button
        type="button"
        onClick={enterSearch}
        className="ml-auto p-1 text-text-secondary transition-colors hover:text-text-primary"
        aria-label="Search events"
      >
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}
