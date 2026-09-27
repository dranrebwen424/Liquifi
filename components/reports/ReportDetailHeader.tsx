import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { eventId: string; title: string; role?: "treasurer" | "adviser" };

export function ReportDetailHeader({ eventId, title, role = "treasurer" }: Props) {
  return (
    <header className="mb-8 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
      <Link href={`/${role}/reports/${eventId}`} prefetch aria-label="Back to report" title="Back to report"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>
      <h1 className="text-center text-lg font-semibold leading-6 text-text-primary">{title}</h1>
    </header>
  );
}
