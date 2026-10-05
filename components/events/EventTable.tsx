import Link from "next/link";
import { ChevronRight, Folder } from "lucide-react";
import { formatPHP } from "@/lib/format";
import type { EventWithMeta } from "@/lib/queries/events";

type Props = {
  events: Pick<EventWithMeta, "id" | "name" | "created_at" | "created_by_name" | "budget_total" | "total_spent" | "num_entries">[];
  basePath: string;
  caption: string;
};

export function EventTable({ events, basePath, caption }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-2xl text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border text-xs font-normal text-text-secondary">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">Name</th>
            <th scope="col" className="px-4 py-3 font-normal">Date</th>
            <th scope="col" className="px-4 py-3 font-normal">Treasurer</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Budget</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Spent</th>
            <th scope="col" className="px-4 py-3 text-right font-normal">Entries</th>
            <th scope="col" className="w-11 px-4 py-3"><span className="sr-only">Open event</span></th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-border transition-colors hover:bg-surface-secondary">
              <th scope="row" className="px-4 py-4 font-semibold text-text-primary">
                <Link href={`${basePath}/${event.id}`} prefetch className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-text-secondary">
                    <Folder className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-32 max-w-xs break-words">{event.name}</span>
                </Link>
              </th>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-text-secondary">
                <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" })}</time>
              </td>
              <td className="px-4 py-4 text-xs text-text-secondary">{event.created_by_name}</td>
              <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-text-primary">{formatPHP(event.budget_total)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums text-text-primary">{formatPHP(event.total_spent)}</td>
              <td className="px-4 py-4 text-right tabular-nums text-text-secondary">{event.num_entries}</td>
              <td className="px-4 py-4">
                <Link href={`${basePath}/${event.id}`} prefetch aria-label={`Open ${event.name}`} className="flex size-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
