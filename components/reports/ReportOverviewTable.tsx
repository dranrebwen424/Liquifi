import Link from "next/link";
import { ChevronRight, CircleMinus, FileText, FolderArchive } from "lucide-react";
import { StatusBadge, reportStatusMap } from "@/components/ui/StatusBadge";
import type { ReportOverviewItem } from "@/lib/report-overview";

type Props = {
  items: ReportOverviewItem[];
  basePath: string;
  archived?: boolean;
};

export function ReportOverviewTable({ items, basePath, archived = false }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{archived ? "Archived financial reports" : "Financial reports"}</caption>
        <thead className="border-b border-border text-xs text-text-secondary">
          <tr>
            <th scope="col" className="py-3 pr-4 font-normal">Event name</th>
            <th scope="col" className="px-3 py-3 font-normal">{archived ? "FS number" : "Control number"}</th>
            {!archived && <th scope="col" className="px-3 py-3 font-normal">Status</th>}
            <th scope="col" className="w-11 py-3"><span className="sr-only">Open report</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = item.report ? reportStatusMap[item.report.status] : null;
            const date = item.report?.generatedAt ?? item.createdAt;
            const Icon = archived ? FolderArchive : FileText;
            const href = `${basePath}/${item.eventId}`;
            return (
              <tr key={item.eventId} className="border-b border-border transition-colors hover:bg-surface-secondary">
                <th scope="row" className="py-4 pr-4 font-semibold text-text-primary">
                  <Link href={href} prefetch className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-text-secondary"><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 wrap-anywhere">
                      <span className="block">{item.eventName}</span>
                      {archived && <time dateTime={date} className="mt-1 block text-xs font-normal text-text-secondary">{new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" })}</time>}
                    </span>
                  </Link>
                </th>
                <td className="px-3 py-4 text-xs tabular-nums text-text-secondary wrap-anywhere">{item.report?.fsDocumentNumber ?? "No report yet"}</td>
                {!archived && <td className="px-3 py-4">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-text-secondary">
                    <StatusBadge icon={status?.icon ?? CircleMinus} variant={status?.variant ?? "neutral"} label={status?.label ?? "No report yet"} aria-hidden="true" />
                    {status?.label ?? "No report yet"}
                  </span>
                </td>}
                <td className="py-4"><Link href={href} prefetch aria-label={`Open ${item.eventName} report`} className="flex size-11 items-center justify-center rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ChevronRight className="size-4" aria-hidden="true" /></Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
