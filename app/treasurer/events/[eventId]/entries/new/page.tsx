"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Pencil, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReceiptUpload, type ParsedUploadResult } from "@/components/entries/ReceiptUpload";
import { ReceiptReview } from "@/components/entries/ReceiptReview";
import { ManualCategoryPicker } from "@/components/entries/ManualCategoryPicker";
import { ManualQuickForm, type ManualSubmitPayload } from "@/components/entries/ManualQuickForm";
import { discardReceiptEntry } from "@/actions/entries";
import type { ParsedReceipt } from "@/agent/types";
import type { ExpenseType } from "@/components/entries/manual-categories";

type Method = "receipt" | "manual";
type ManualScreen = "picker" | "form" | "success";

type Props = {
  params: Promise<{ eventId: string }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  transportation: "Transportation",
  meals: "Meals",
  honorarium: "Honorarium",
  supplies: "Supplies",
  printing: "Printing",
  rental: "Rental",
  others: "Other",
};

export default function NewEntryPage({ params }: Props) {
  const router = useRouter();
  const { eventId } = use(params);

  const [method, setMethod] = useState<Method>("receipt");

  // Receipt flow
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  // Manual flow
  const [manualScreen, setManualScreen] = useState<ManualScreen>("picker");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseType | null>(null);

  // ─── Receipt flow ──────────────────────────────────────────────

  const handleParsed = useCallback(({ entryId: id, parsed }: ParsedUploadResult) => {
    setEntryId(id);
    setParsedData(parsed);
    setReviewOpen(true);
  }, []);

  const handleDiscard = useCallback(async () => {
    if (!entryId) return;
    setDiscarding(true);
    await discardReceiptEntry(entryId, eventId);
    setDiscarding(false);
    setReviewOpen(false);
    setTimeout(() => setParsedData(null), 150);
  }, [entryId, eventId]);

  const handleConfirm = useCallback(async () => {
    if (!parsedData) return;
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 800));
    setConfirming(false);
    setReviewOpen(false);
    router.push(`/treasurer/events/${eventId}`);
  }, [parsedData, eventId, router]);

  // ─── Manual flow ───────────────────────────────────────────────

  const handleCategorySelect = useCallback((category: ExpenseType) => {
    setSelectedCategory(category);
    setManualScreen("form");
  }, []);

  const handleFormBack = useCallback(() => {
    setManualScreen("picker");
    setSelectedCategory(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (_data: ManualSubmitPayload) => {
      await new Promise((r) => setTimeout(r, 600));
      setManualScreen("success");
    },
    [],
  );

  const handleLogAnother = useCallback(() => {
    setManualScreen("form");
  }, []);

  const handleClose = useCallback(() => {
    router.push(`/treasurer/events/${eventId}`);
  }, [eventId, router]);

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Back link */}
      <button
        onClick={handleClose}
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
              onClick={() => {
                setMethod(opt.value);
                setManualScreen("picker");
                setSelectedCategory(null);
              }}
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
          <ReceiptUpload
            eventId={eventId}
            onParsed={handleParsed}
            onExhausted={() => {
              setMethod("manual");
              setManualScreen("picker");
              setSelectedCategory(null);
            }}
            onNoReceipt={() => {
              setMethod("manual");
              setManualScreen("picker");
              setSelectedCategory(null);
            }}
          />
        ) : manualScreen === "picker" ? (
          <ManualCategoryPicker onSelect={handleCategorySelect} />
        ) : manualScreen === "form" && selectedCategory ? (
          <ManualQuickForm
            category={selectedCategory}
            eventId={eventId}
            onBack={handleFormBack}
            onSubmit={handleFormSubmit}
          />
        ) : manualScreen === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-lightest">
              <Check className="h-7 w-7 text-success" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-text-primary">
                Entry Submitted
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Your department adviser will review this entry.
              </p>
            </div>
            <div className="mt-2 flex w-full flex-col gap-2">
              <button
                onClick={handleLogAnother}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Log another{" "}
                {selectedCategory
                  ? CATEGORY_LABELS[selectedCategory]
                  : "entry"}
                ?
              </button>
              <button
                onClick={handleClose}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Receipt review modal / sheet */}
      {parsedData && (
        <ReceiptReview
          open={reviewOpen}
          data={parsedData}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
          onClose={handleDiscard}
          confirming={confirming || discarding}
        />
      )}
    </div>
  );
}
