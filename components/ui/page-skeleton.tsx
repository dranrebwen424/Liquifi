import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard-shaped loading placeholder. Rendered inside the role layout
 * (sidebar stays live) while the page's server data loads — makes
 * navigation feel instant instead of hanging on a blank screen.
 */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8" aria-busy="true">
      <div className="flex items-center justify-between">
        {title ? (
          <Skeleton className="h-8 w-44" />
        ) : (
          <Skeleton className="h-8 w-56" />
        )}
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-light bg-surface p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      {/* List rows */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border-light bg-surface p-4"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
