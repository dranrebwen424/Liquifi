"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-lg font-semibold text-text-primary">Couldn&apos;t load this report</h1>
      <p role="alert" className="mt-2 text-sm text-text-secondary">Please try again in a moment.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Try again</button>
        <Link href="/adviser/reports" className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-5 text-sm text-text-primary hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent">Back to reports</Link>
      </div>
    </div>
  );
}
