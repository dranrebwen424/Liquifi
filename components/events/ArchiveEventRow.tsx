import Link from "next/link";
import { ChevronRight, Folder } from "lucide-react";

type Props = {
  id: string;
  name: string;
  createdAt: string;
  /** Override the default treasurer link. */
  href?: string;
};

/**
 * Mobile-only archive event row — folder icon, name, date, chevron.
 * Matches Figma archive list design. Desktop uses EventListItem instead.
 */
export function ArchiveEventRow({ id, name, createdAt, href }: Props) {
  const dateStr = new Date(createdAt).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    // prefetch: full event route warmed by Next's viewport-first scheduler.
    <Link
      href={href ?? `/treasurer/events/${id}`}
      prefetch
      className="group flex items-center gap-3 border-b border-border py-3 transition-all duration-150 hover:bg-surface-secondary active:scale-[0.98]"
    >
      <Folder className="h-5 w-5 shrink-0 text-text-muted transition-colors group-hover:text-text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-text-primary">{name}</p>
        <p className="mt-0.5 text-xs text-text-muted">{dateStr}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
    </Link>
  );
}
