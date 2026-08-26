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
    <div className="flex items-center gap-2.5 rounded-[5px] border border-border bg-surface px-3.5 py-2.5 shadow-[0px_2px_10px_0px_rgba(0,0,0,0.02)]">
      <Lock className="h-4 w-4 shrink-0 text-text-muted" />
      <div>
        <p className="text-[13px] font-medium text-text-primary">
          Pending Adviser Approval
        </p>
        <p className="text-[10px] leading-snug text-text-muted">
          New entries cannot be added while this event is awaiting approval.
        </p>
      </div>
    </div>
  );
}
