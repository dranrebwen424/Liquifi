export function EventPageLoading() {
  return (
    <div className="flex flex-col gap-6 pb-16" aria-busy="true" aria-label="Loading event">
      <div className="h-4 w-28 animate-pulse rounded bg-surface-secondary" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-secondary" />
          <div className="h-3 w-32 animate-pulse rounded bg-surface-secondary" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-surface-secondary" />
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-surface-inverse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-52 animate-pulse rounded-xl bg-surface-secondary" />
        ))}
      </div>
    </div>
  );
}
