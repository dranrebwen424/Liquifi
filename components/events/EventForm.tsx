"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type EventFormProps = {
  /** Called on submit. Defaults to mock behavior if omitted. */
  onSubmit?: (name: string, budgetTotal: number) => Promise<void>;
};

export function EventForm({ onSubmit }: EventFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameTrimmed = name.trim();
    const parsed = parseFloat(budgetTotal);

    if (!nameTrimmed) {
      setError("Event name is required.");
      return;
    }
    if (!budgetTotal || isNaN(parsed) || parsed <= 0) {
      setError("Budget must be a positive amount.");
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(nameTrimmed, parsed);
      } else {
        // ponytail: mock — simulate success and navigate
        await new Promise((r) => setTimeout(r, 600));
        router.push("/treasurer/home");
      }
    } catch {
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Back link */}
      <Link
        href="/treasurer/home"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <h1 className="text-xl font-semibold text-text-primary">New Event</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Set up a new event budget to start tracking expenses.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          {/* Event name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-text-primary"
            >
              Event Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CCS Week 2026"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          {/* Budget total */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="budget"
              className="text-sm font-medium text-text-primary"
            >
              Total Budget (₱)
            </label>
            <input
              id="budget"
              type="number"
              step="0.01"
              min="0.01"
              value={budgetTotal}
              onChange={(e) => setBudgetTotal(e.target.value)}
              placeholder="0.00"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
            <p className="text-xs text-text-muted">
              This can be edited later until the first expense is deducted.
            </p>
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
