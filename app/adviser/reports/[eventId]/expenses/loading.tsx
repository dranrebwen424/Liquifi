import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingExpenses() {
  return (
    <div role="status" aria-label="Loading expenses" className="mx-auto w-full max-w-4xl px-2 pb-16 pt-6 sm:px-4 sm:pt-10">
      <span className="sr-only">Loading expenses</span>
      <Skeleton className="mb-8 h-12 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-60 rounded-xl" />)}
      </div>
    </div>
  );
}
