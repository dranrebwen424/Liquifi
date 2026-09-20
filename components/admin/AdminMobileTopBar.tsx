"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UserRoundCheck } from "lucide-react";
import { useAutoHideTopBar } from "@/hooks/useAutoHideTopBar";
import { isAdminDepartmentWorkspace } from "@/lib/admin-routes";
import { isImmersivePage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

type Props = {
  adminInitial: string;
  pendingApprovalsCount: number;
};

export function AdminMobileTopBar({ adminInitial, pendingApprovalsCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topBarVisible = useAutoHideTopBar();
  const isSearching = searchParams.get("search") === "1";
  const hidden = isImmersivePage(pathname) || isAdminDepartmentWorkspace(pathname);

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
      <header className="sticky top-0 z-40 flex h-16 items-center gap-2 bg-background px-4 lg:hidden">
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
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-3 bg-background px-2 transition-transform duration-200 motion-reduce:transition-none lg:hidden",
        topBarVisible ? "translate-y-0" : "-translate-y-full",
      )}
    >
        <Link
          href="/admin/profile"
          aria-label="Open profile"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-border-strong text-base font-bold text-text-primary">
            {adminInitial}
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
          aria-label={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : "Open approvals"}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <UserRoundCheck className="h-6 w-6" />
          {pendingApprovalsCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-background" />
          )}
        </Link>
    </header>
  );
}
