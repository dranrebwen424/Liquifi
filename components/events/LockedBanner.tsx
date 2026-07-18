type LockedBannerProps = {
  /** True when Event.is_locked (report pending or approved). */
  isLocked: boolean;
  /** True when Event.status === 'archived'. */
  isArchived: boolean;
};

export function LockedBanner({ isLocked, isArchived }: LockedBannerProps) {
  if (isArchived) {
    return (
      <div className="rounded-xl border border-border bg-neutral-light px-4 py-3 text-sm font-medium text-neutral-foreground">
        Archived — this event is read-only.
      </div>
    );
  }

  if (!isLocked) return null;

  return (
    <div className="rounded-xl border border-border bg-warning-lightest px-4 py-3 text-sm font-medium text-warning-foreground">
      Locked — report pending adviser approval.
    </div>
  );
}
