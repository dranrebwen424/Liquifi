"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceiptUpload } from "@/components/entries/ReceiptUpload";
import { ReceiptReview } from "@/components/entries/ReceiptReview";
import { ManualEntryForm } from "@/components/entries/ManualEntryForm";
import type { MockParsedReceipt } from "@/components/entries/ReceiptUpload";

type Method = "receipt" | "manual";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default function NewEntryPage({ params }: Props) {
  const router = useRouter();
  const { eventId } = use(params);

  const [method, setMethod] = useState<Method>("receipt");
  const [parsedData, setParsedData] = useState<MockParsedReceipt | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ─── Receipt flow ──────────────────────────────────────────────

  const handleParsed = useCallback((data: MockParsedReceipt) => {
    setParsedData(data);
    setReviewOpen(true);
  }, []);

  const handleDiscard = useCallback(() => {
    setReviewOpen(false);
    setTimeout(() => setParsedData(null), 150);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!parsedData) return;
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 800));
    setConfirming(false);
    setReviewOpen(false);
    router.push(`/treasurer/events/${eventId}`);
  }, [parsedData, eventId, router]);

  // ─── Manual flow ───────────────────────────────────────────────

  const handleManualSubmit = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 600));
    router.push(`/treasurer/events/${eventId}`);
  }, [eventId, router]);

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Back link */}
      <button
        onClick={() => router.push(`/treasurer/events/${eventId}`)}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Event
      </button>

      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
          Log Entry
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Add an expense to this event using a receipt or a manual entry.
        </p>
      </div>

      {/* Method toggle */}
      <div className="flex rounded-xl border border-border bg-surface p-1">
        {[
          { value: "receipt" as Method, label: "Upload Receipt", icon: Camera },
          { value: "manual" as Method, label: "No Receipt", icon: Pencil },
        ].map((opt) => {
          const active = method === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMethod(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="rounded-xl border border-border-strong bg-surface p-5 sm:p-6">
        {method === "receipt" ? (
          <ReceiptUpload onParsed={handleParsed} />
        ) : (
          <ManualEntryForm onSubmit={handleManualSubmit} />
        )}
      </div>

      {/* Receipt review modal / sheet */}
      {parsedData && (
        <ReceiptReview
          open={reviewOpen}
          data={parsedData}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
          onClose={handleDiscard}
          confirming={confirming}
        />
      )}
    </div>
  );
}
