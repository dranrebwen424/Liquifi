"use client";

import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAutoHideTopBar } from "@/hooks/useAutoHideTopBar";
import { isImmersivePage } from "@/lib/event-route";
import { cn } from "@/lib/utils";

type Props = {
  adminInitial: string;
  pendingApprovalsCount: number;
};

export function AdminTopBar({ adminInitial, pendingApprovalsCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const topBarVisible = useAutoHideTopBar();
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
    <header
      className={cn(
        "sticky top-0 z-40 hidden h-16 items-center gap-3 bg-background px-4 transition-transform duration-200 motion-reduce:transition-none md:px-8 lg:flex",
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

      <div className="min-w-0 flex-1">
        <input
          type="search"
          key={currentQuery}
          defaultValue={currentQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search Department"
          aria-label="Search departments"
          className="h-11 w-full rounded-full border border-accent bg-background px-4 text-center text-sm text-text-primary placeholder:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

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
