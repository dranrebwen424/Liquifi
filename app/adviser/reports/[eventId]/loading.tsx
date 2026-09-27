import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading report" className="mx-auto w-full max-w-2xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <span className="sr-only">Loading report</span>
      <Skeleton className="mb-8 h-20 w-full rounded-lg" />
      <div className="space-y-5 rounded-2xl bg-surface-inverse p-6">
        <Skeleton className="h-5 w-2/3 bg-text-inverse/10" />
        <Skeleton className="h-3 w-1/2 bg-text-inverse/10" />
        <Skeleton className="h-11 w-full rounded-full bg-text-inverse/10" />
      </div>
      <div className="my-8 grid grid-cols-2 gap-8"><Skeleton className="aspect-[353/268] rounded-lg" /><Skeleton className="aspect-[353/268] rounded-lg" /></div>
      <Skeleton className="mb-3 h-14 rounded-sm" /><Skeleton className="h-14 rounded-sm" />
    </div>
  );
}
