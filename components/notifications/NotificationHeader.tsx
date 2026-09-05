"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
  role: "treasurer" | "adviser";
  title: string;
  tagline: string;
  unreadCount: number;
};

export function NotificationHeader({ role, title, tagline, unreadCount }: Props) {
  const router = useRouter();
  const home = role === "adviser" ? "/adviser/home" : "/treasurer/home";

  return (
    <div className="flex items-center gap-3 md:gap-4">
      <button
        type="button"
        onClick={() => router.push(home)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold leading-tight text-text-primary md:text-xl">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-text-muted md:text-sm">
          {unreadCount > 0 ? `${unreadCount} unread · ${tagline}` : tagline}
        </p>
      </div>
    </div>
  );
}