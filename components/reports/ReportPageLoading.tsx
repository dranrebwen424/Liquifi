import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the treasurer report workspace and its three
 * sub-pages. Mirrors the real layout (centered max-w-2xl column, header row,
 * progress rails, inverse panel, three navigation rows) so the swap to loaded
 * content does not shift anything.
 *
 * ponytail: the conditional parts of the real page — adviser feedback card,
 * the panel's state-specific body — are deliberately absent. A skeleton that
 * guesses at them would flicker when it guessed wrong.
 */
export function ReportPageLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-2 pb-16 pt-6 sm:px-4 sm:pt-10"
      aria-busy="true"
    >
      <span className="sr-only">Loading report…</span>

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 pt-2">
            <Skeleton className="h-6 w-44 max-w-full" />
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-1.5 h-3 w-20" />
          </div>
        </div>
        <Skeleton className="mt-1 h-10 w-28 shrink-0 rounded-full" />
      </div>

      <div className="grid grid-cols-3 gap-2 px-2">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-1 w-full rounded-full" />
            <Skeleton className="mx-auto mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Inverse panel — skeletons invert to text-inverse/10, matching how
          SignatorySetup tokenizes its inputs on a dark surface. */}
      <div className="rounded-2xl bg-surface-inverse px-5 py-6 sm:px-8 sm:py-8">
        <Skeleton className="h-7 w-56 max-w-full bg-text-inverse/10" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full bg-text-inverse/10" />
        <Skeleton className="mt-2 h-4 w-56 max-w-full bg-text-inverse/10" />
      </div>

      <div className="flex flex-col gap-2.5 px-3 sm:px-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex min-h-14 items-center gap-3 rounded-sm bg-surface px-4 py-3.5 shadow-card"
          >
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-4 w-4 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
