import { Lock, Archive } from "lucide-react";

type LockedBannerProps = {
  /** True when Event.is_locked (report pending or approved). */
  isLocked: boolean;
  /** True when Event.status === 'archived'. */
  isArchived: boolean;
};

export function LockedBanner({ isLocked, isArchived }: LockedBannerProps) {
  if (isArchived) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border border-l-[3px] border-l-neutral bg-neutral-light px-4 py-3">
        <Archive className="h-4 w-4 shrink-0 text-neutral-foreground" />
        <div>
          <p className="text-sm font-medium text-neutral-foreground">
            Archived
          </p>
          <p className="text-xs text-text-muted">This event is read-only.</p>
        </div>
      </div>
    );
  }

  if (!isLocked) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border border-l-[3px] border-l-info bg-info-lightest px-4 py-3">
      <Lock className="h-4 w-4 shrink-0 text-info-foreground" />
      <div>
        <p className="text-sm font-medium text-info-foreground">Locked</p>
        <p className="text-xs text-text-muted">
          Report pending adviser approval.
        </p>
      </div>
    </div>
  );
}
