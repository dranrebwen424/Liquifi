import { cn } from "@/lib/utils";

/**
 * Bare pulsing block — base for all loading placeholders.
 * Uses surface tokens so it reads as "blank card", not a broken page.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-tertiary",
        className,
      )}
    />
  );
}
