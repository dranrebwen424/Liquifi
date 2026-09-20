"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardCheck, LayoutGrid, Menu, Search } from "lucide-react";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";
import type { NavItemConfig } from "@/components/layout/NavItem";
import { isAdminDepartmentWorkspace } from "@/lib/admin-routes";
import { isImmersivePage } from "@/lib/event-route";

const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  { label: "Departments", href: "/admin/departments", icon: LayoutGrid },
  { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
];

type Props = {
  pendingApprovalsCount: number;
};

export function AdminMobileTopBar({ pendingApprovalsCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = searchParams.get("search") === "1";
  const hidden = isImmersivePage(pathname) || isAdminDepartmentWorkspace(pathname);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 bg-background px-4 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text-muted"
          onClick={() => router.push("/admin/departments?search=1")}
        >
          <Search className="h-4 w-4" />
          Search departments
        </button>
        <Link
          href="/admin/approvals"
          aria-label={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : "Open approvals"}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary"
        >
          <ClipboardCheck className="h-6 w-6" />
          {pendingApprovalsCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-background" />
          )}
        </Link>
      </header>
      <MobileSidebarDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        navItems={ADMIN_NAV_ITEMS}
        role="admin"
      />
    </>
  );
}
