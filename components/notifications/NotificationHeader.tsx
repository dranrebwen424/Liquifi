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
    <div className="flex items-center gap-3 lg:gap-4">
      <button
        type="button"
        onClick={() => router.push(home)}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="mb-1 hidden text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary lg:block">Activity center</p>
        <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
          <h1 className="text-base font-semibold leading-6 text-text-primary lg:text-[28px] lg:leading-9">{title}</h1>
          {unreadCount > 0 && <span className="rounded-full bg-accent-light px-2.5 py-1 text-[10px] font-medium text-text-primary lg:text-xs">{unreadCount} unread</span>}
        </div>
        <p className="mt-1 text-[11px] leading-5 text-text-secondary lg:text-sm lg:leading-6">{tagline}</p>
      </div>
    </div>
  );
}