"use client";

import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isImmersivePage } from "@/lib/event-route";

type Props = {
  pendingApprovalsCount: number;
};

export function AdminTopBar({ pendingApprovalsCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hidden = isImmersivePage(pathname);
  const currentQuery = searchParams.get("q") ?? "";

  const onSearch = (value: string) => {
    const params = new URLSearchParams();
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    const next = params.toString();
    router.replace(`/admin/departments${next ? `?${next}` : ""}`, { scroll: false });
  };

  if (hidden) return null;

  return (
    <header className="sticky top-0 z-40 hidden h-16 items-center gap-3 border-b border-border bg-surface px-4 md:px-8 lg:flex">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          key={currentQuery}
          defaultValue={currentQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search departments"
          className="h-11 w-full rounded-full border border-border bg-surface-secondary pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <Link
        href="/admin/approvals"
        aria-label={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : "Approvals"}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent transition-colors hover:bg-accent-muted"
      >
        <ShieldCheck className="h-5 w-5" />
        {pendingApprovalsCount > 0 && (
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface" />
        )}
      </Link>
    </header>
  );
}