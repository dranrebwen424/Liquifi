import { Archive, Check, Clock, Lock } from "lucide-react";
import type { ReportStatus } from "@/types";
import { cn } from "@/lib/utils";

type LockedBannerProps = {
  /** True when Event.is_locked (report pending or approved). */
  isLocked: boolean;
  /** True when Event.status === 'archived'. */
  isArchived: boolean;
  /** Latest report status; disambiguates locked pending vs approved. */
  reportStatus?: ReportStatus | null;
};

export function LockedBanner({ isLocked, isArchived, reportStatus }: LockedBannerProps) {
  if (!isArchived && !isLocked) return null;

  const state = isArchived ? "archived" : reportStatus === "approved" ? "approved" : reportStatus === "pending_adviser_approval" ? "pending" : "locked";
  const copy = {
    pending: {
      icon: Clock,
      title: "Pending adviser approval",
      description: "The report is waiting for review. New entries are paused.",
      tile: "bg-warning-light text-warning-foreground",
    },
    approved: {
      icon: Check,
      title: "Report approved",
      description: "Ready for signed upload and archiving. New entries stay locked.",
      tile: "bg-success-light text-success-foreground",
    },
    archived: {
      icon: Archive,
      title: "Archived event",
      description: "This event is permanently read-only.",
      tile: "bg-neutral-light text-neutral-foreground",
    },
    locked: {
      icon: Lock,
      title: "Event locked",
      description: "A report is active. New entries are paused.",
      tile: "bg-accent-light text-accent",
    },
  }[state];

  const Icon = copy.icon;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", copy.tile)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold leading-5 text-text-primary">{copy.title}</p>
        <p className="text-[11px] leading-4 text-text-muted">{copy.description}</p>
      </div>
    </div>
  );
}
