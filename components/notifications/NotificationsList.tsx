"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Bell, ChevronRight, FileCheck2, FileX2, FileClock, UserRoundCheck, ReceiptText, CircleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import type { NotificationRow } from "@/components/notifications/types";

type Props = {
  items: NotificationRow[];
  unreadCount: number;
};

type InboxFilter = "all" | "unread";
const PAGE = 10;
const MONTH = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" });
const EXACT_TIME = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  report_approved: { icon: FileCheck2, color: "text-success-foreground" },
  report_rejected: { icon: FileX2, color: "text-error-foreground" },
  report_ready_for_approval: { icon: FileClock, color: "text-warning-foreground" },
  adviser_signup_pending: { icon: UserRoundCheck, color: "text-warning-foreground" },
  treasurer_signup_pending: { icon: UserRoundCheck, color: "text-warning-foreground" },
  signup_approved: { icon: UserRoundCheck, color: "text-success-foreground" },
  signup_rejected: { icon: UserRoundCheck, color: "text-error-foreground" },
  manual_entry_pending: { icon: ReceiptText, color: "text-warning-foreground" },
  entry_approved: { icon: ReceiptText, color: "text-success-foreground" },
  entry_rejected: { icon: ReceiptText, color: "text-error-foreground" },
  event_overspend: { icon: CircleAlert, color: "text-error-foreground" },
};

function notificationIcon(type?: string): { icon: typeof Bell; color: string } {
  return type && Object.hasOwn(ICONS, type) ? ICONS[type] : { icon: Bell, color: "text-text-secondary" };
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

export function NotificationsList({ items, unreadCount }: Props) {
  const router = useRouter();
  const lastUnreadIdx = items.reduce<number>((last, row, index) => row.read ? last : index, -1);
  const initialVisible = Math.min(Math.max(PAGE, lastUnreadIdx + 1), items.length);
  const [visible, setVisible] = useState(initialVisible);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const filtered = filter === "unread" ? items.filter((row) => !row.read) : items;
  const shown = filtered.slice(0, Math.max(visible, initialVisible));
  const hasMore = shown.length < filtered.length;
  const groups = new Map<string, NotificationRow[]>();
  for (const row of shown) {
    const month = MONTH.format(new Date(row.created_at));
    const group = groups.get(month) ?? [];
    group.push(row);
    groups.set(month, group);
  }

  const handleOpen = async (row: NotificationRow): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setBusy(row.id);
    setError("");
    try {
      if (!row.read) {
        const result = await markNotificationRead(row.id);
        if (!result.success) {
          setError("Couldn?t mark this notification as read. Please try again.");
          return;
        }
        router.refresh();
      }
      if (row.url) router.push(row.url);
    } catch {
      setError("Couldn?t open this notification. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  const handleMarkAll = async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setBusy("all");
    setError("");
    try {
      const result = await markAllNotificationsRead();
      if (!result.success) {
        setError("Couldn?t mark your notifications as read. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn?t update your notifications. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-0 py-2.5 lg:px-6 lg:py-4">
        <div className="flex items-center gap-2" role="group" aria-label="Filter notifications">
          {(["all", "unread"] as const).map((option) => (
            <button key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:gap-2 lg:px-4 lg:text-xs", filter === option ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary")}>
              {option === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
        {unreadCount > 0 && <button type="button" onClick={handleMarkAll} disabled={busy !== null} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50 lg:gap-2 lg:px-4 lg:text-xs">
          {busy === "all" ? <Loader2 className="size-3.5 animate-spin lg:size-4" aria-hidden="true" /> : <CheckCheck className="size-3.5 lg:size-4" aria-hidden="true" />}
          {busy === "all" ? "Marking as read?" : "Mark all read"}
        </button>}
      </div>
      {error && <p role="alert" className="mx-4 mt-4 rounded-xl border border-error-light bg-error-lightest px-4 py-3 text-xs leading-5 text-error-foreground lg:mx-6 lg:text-sm">{error}</p>}
      <div aria-busy={busy !== null}>
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center lg:py-24">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-secondary text-text-secondary lg:size-14"><Bell className="size-5 lg:size-6" aria-hidden="true" /></span>
            <h2 className="text-xs font-semibold text-text-primary lg:text-base">{filter === "unread" && items.length > 0 ? "No unread notifications" : "No notifications yet"}</h2>
            <p className="max-w-sm text-[11px] leading-5 text-text-secondary lg:text-sm lg:leading-6">{filter === "unread" && items.length > 0 ? "You?ve read all the updates in this inbox. Switch to All to revisit them." : "Approvals, report updates, and account activity will appear here."}</p>
          </div>
        ) : Array.from(groups, ([month, rows]) => (
          <section key={month} aria-label={month}>
            <h2 className="border-b border-border-light px-0 py-3 text-[10px] font-medium uppercase tracking-wide text-text-secondary lg:px-6 lg:py-3.5 lg:text-[11px]">{month}</h2>
            <ul className="divide-y divide-border-light">
              {rows.map((row) => {
                const { icon: Icon, color } = notificationIcon(row.type);
                return (
                  <li key={row.id}>
                    <button type="button" onClick={() => handleOpen(row)} disabled={busy !== null} className={cn("group flex w-full items-start gap-3 px-0 py-4 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-wait lg:items-center lg:gap-4 lg:px-6 lg:py-5", !row.read && "bg-accent-muted/50")}>
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-secondary lg:size-11 lg:rounded-2xl", color)}><Icon className="size-4 lg:size-5" aria-hidden="true" /></span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-start justify-between gap-2 lg:items-center lg:gap-4">
                          <span className={cn("text-xs leading-5 lg:text-sm lg:leading-6", row.read ? "font-medium text-text-secondary" : "font-semibold text-text-primary")}><span className="sr-only">{row.read ? "Read notification: " : "Unread notification: "}</span>{row.title}</span>
                          <time dateTime={row.created_at} title={EXACT_TIME.format(new Date(row.created_at))} className="shrink-0 pt-0.5 text-[10px] leading-4 text-text-secondary lg:pt-0 lg:text-xs">{timeAgo(row.created_at)}</time>
                        </span>
                        {row.body && <span className="line-clamp-2 max-w-4xl text-[11px] leading-5 text-text-secondary lg:text-sm lg:leading-6">{row.body}</span>}
                      </span>
                      <span className="flex min-h-8 w-3 shrink-0 flex-col items-center justify-center gap-2 lg:min-h-11 lg:w-5">{!row.read && <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />}{busy === row.id ? <Loader2 className="size-3 animate-spin text-text-secondary lg:size-4" aria-hidden="true" /> : row.url && <ChevronRight className="hidden size-4 text-text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none lg:block" aria-hidden="true" />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {shown.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-0 py-3 lg:px-6 lg:py-4">
        <p className="text-[10px] text-text-secondary lg:text-xs" aria-live="polite">Showing {shown.length} of {filtered.length} {filtered.length === 1 ? "update" : "updates"}</p>
        {hasMore && <button type="button" onClick={() => setVisible((current) => Math.min(Math.max(current, initialVisible) + PAGE, filtered.length))} className="min-h-11 rounded-full border border-border bg-surface px-4 text-[11px] font-medium text-text-primary hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent lg:text-xs">See more</button>}
      </div>}
    </div>
  );
}
