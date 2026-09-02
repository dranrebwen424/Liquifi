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
    <Link
      href={href ?? `/treasurer/events/${id}`}
      className="flex items-center gap-3 py-3"
    >
      <Folder className="h-5 w-5 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text-primary">{name}</p>
        <p className="text-[10px] text-text-muted">{dateStr}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
    </Link>
  );
}
