"use client";

import { useRouter } from "next/navigation";
import { CheckCheck, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import type { NotificationRow } from "@/components/notifications/types";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

type Props = {
  items: NotificationRow[];
  unreadCount: number;
};

export function NotificationsList({ items, unreadCount }: Props) {
  const router = useRouter();

  const handleOpen = async (row: NotificationRow) => {
    if (!row.read) {
      await markNotificationRead(row.id);
      router.refresh();
    }
    if (row.url) router.push(row.url);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    router.refresh();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent">
          <Bell className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-text-primary">No notifications yet</p>
        <p className="text-xs text-text-muted">
          Approvals, rejections, and signup updates will land here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{unreadCount} unread</span>
          <button
            type="button"
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent-light px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-muted"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} />
            Mark all as read
          </button>
        </div>
      )}

      {items.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => handleOpen(row)}
          className={cn(
            "group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
            row.read
              ? "border-border bg-surface hover:bg-surface-secondary"
              : "border-accent/30 bg-accent-light/40 hover:bg-accent-light",
          )}
        >
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              row.read ? "bg-border" : "bg-accent",
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  row.read ? "text-text-secondary" : "text-text-primary",
                )}
              >
                {row.title}
              </span>
              <span className="shrink-0 text-[11px] text-text-muted">
                {timeAgo(row.created_at)}
              </span>
            </span>
            {row.body && (
              <span className="line-clamp-2 text-xs leading-relaxed text-text-muted">
                {row.body}
              </span>
            )}
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
}
