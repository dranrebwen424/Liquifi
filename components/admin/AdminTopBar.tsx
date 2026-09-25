"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UserRoundCheck } from "lucide-react";
import { isImmersivePage } from "@/lib/event-route";

type Props = {
  adminInitial: string;
  adminAvatarUrl: string | null;
  pendingApprovalsCount: number;
};

export function AdminTopBar({ adminInitial, adminAvatarUrl, pendingApprovalsCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Desktop bar is static: no auto-hide, so no scroll listener runs on desktop.
  // Auto-hide is a mobile affordance; on desktop it only bought jitter and a
  // second React state update per reversal.
  const hidden = isImmersivePage(pathname);
  const isSearching = searchParams.get("search") === "1";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ponytail: debounce URL sync so router.replace doesn't fire on every keystroke
  useEffect(() => {
    if (!isSearching) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({ search: "1" });
      if (query) params.set("q", query);
      router.replace(`/admin/departments?${params.toString()}`, { scroll: false });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isSearching, query, router]);

  if (hidden) return null;

  if (isSearching) {
    return (
      <header className="sticky top-0 z-40 hidden h-16 items-center gap-2 bg-background px-4 md:px-8 lg:flex">
        <button
          type="button"
          aria-label="Exit search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary"
          onClick={() => router.replace("/admin/departments")}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search departments"
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 hidden h-16 items-center gap-3 bg-background px-4 md:px-8 lg:flex">
      <Link
        href="/admin/profile"
        aria-label="Open profile"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-border-strong text-base font-bold text-text-primary">
          {adminAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={adminAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            adminInitial
          )}
        </span>
      </Link>

      <button
        type="button"
        className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-accent bg-background px-4 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => router.push("/admin/departments?search=1")}
      >
        Search Department
      </button>

      <Link
        href="/admin/approvals"
        aria-label={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : "Approvals"}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent transition-colors hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <UserRoundCheck className="h-6 w-6" />
        {pendingApprovalsCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-background" />
        )}
      </Link>
    </header>
  );
}