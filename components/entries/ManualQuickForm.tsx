"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  X,
  Image,
  ChevronDown,
  Loader2,
  Check,
  Users,
  Paperclip,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPHP, formatNumberInput } from "@/lib/format";
import { CATEGORIES, type ExpenseType, type ComputeField } from "@/components/entries/manual-categories";
import { FloatingInput } from "@/components/entries/FloatingInput";
import { usePeopleReuse } from "@/hooks/usePeopleReuse";
import { CameraViewfinder } from "@/components/entries/CameraViewfinder";

// ─── Types ─────────────────────────────────────────────────────────

type ItemRow = {
  id: string;
  description: string;
  qty: number;
  price: number;
};

export type ManualSubmitPayload = {
  category: ExpenseType;
  route?: string;
  occasion?: string;
  recipient?: string;
  fieldValues: Record<string, number | boolean>;
  items: ItemRow[];
  otherMode: "flat" | "itemized";
  totalAmount: number;
  witness: string;
  photoFile: File | null;
  justification: string;
};

type ManualQuickFormProps = {
  category: ExpenseType;
  eventId: string;
  onBack: () => void;
  onSubmit: (data: ManualSubmitPayload) => Promise<void>;
};

// ─── Component ─────────────────────────────────────────────────────

export function ManualQuickForm({
  category,
  eventId,
  onBack,
  onSubmit,
}: ManualQuickFormProps) {
  const config = CATEGORIES[category];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fixed field values (text, currency, number, toggle)
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // Dynamic item rows (supplies, other-itemized)
  const [items, setItems] = useState<ItemRow[]>([]);

  // Other sub-mode
  const [otherMode, setOtherMode] = useState<"flat" | "itemized">("flat");

  // Common extras
  const [witness, setWitness] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [showJustification, setShowJustification] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // People reuse
  const { read, write } = usePeopleReuse(eventId);
  const [suggestedNames, setSuggestedNames] = useState<string | null>(null);

  useEffect(() => {
    const stored = read();
    if (stored) setSuggestedNames(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applySuggestion = useCallback(() => {
    if (suggestedNames) setWitness(suggestedNames);
  }, [suggestedNames]);

  // Reset state when category changes
  useEffect(() => {
    setFieldValues({});
    setItems([]);
    setOtherMode("flat");
    setJustification("");
    setShowJustification(false);
    setError("");
    setSubmitted(false);
  }, [category]);

  // ─── Computed total ────────────────────────────────────────────

  const { total, parts } = useMemo(() => {
    if (category === "supplies") {
      const sum = items.reduce((acc, i) => acc + i.qty * i.price, 0);
      return {
        total: sum,
        parts: items.map((i) => `${formatPHP(i.price)} × ${i.qty}`),
      };
    }

    if (category === "others") {
      if (otherMode === "flat") {
        const amt = Number(fieldValues.amount ?? 0);
        return { total: amt, parts: [] };
      }
      const sum = items.reduce((acc, i) => acc + i.qty * i.price, 0);
      return {
        total: sum,
        parts: items.map((i) => `${formatPHP(i.price)} × ${i.qty}`),
      };
    }

    return config.compute(fieldValues);
  }, [category, config, fieldValues, items, otherMode]);

  // ─── Validation ────────────────────────────────────────────────

  const isValid = useMemo(() => {
    if (!witness.trim()) return false;

    if (category === "supplies") {
      return (
        items.length > 0 &&
        items.every((i) => i.description.trim() && i.qty > 0 && i.price >= 0)
      );
    }

    if (category === "others") {
      if (!justification.trim()) return false;
      if (otherMode === "flat") return (fieldValues.amount ?? 0) > 0;
      return (
        items.length > 0 &&
        items.every((i) => i.description.trim() && i.qty > 0 && i.price >= 0)
      );
    }

    // Default: all numeric compute fields must be > 0
    const numericFields = config.fields.filter((f) => f.type !== "text");
    return numericFields.every((f) => (fieldValues[f.key] ?? 0) > 0);
  }, [category, config, witness, items, otherMode, fieldValues, justification]);

  // ─── Item management ───────────────────────────────────────────

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", qty: 1, price: 0 },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: string, field: keyof ItemRow, value: string | number) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
      );
    },
    [],
  );

  // ─── Photo attachment ──────────────────────────────────────────

  /** Validate + attach a photo — shared by the library input and the camera shutter. */
  const applyPhoto = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10 MB).");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }, []);

  const handlePhotoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setShowCamera(false); // picked via the camera overlay's "Use Photo Library"
        applyPhoto(file);
      }
    },
    [applyPhoto],
  );

  /** Camera shutter → same validate + preview path as the library input. */
  const handleCameraCapture = useCallback(
    (file: File) => {
      setShowCamera(false);
      applyPhoto(file);
    },
    [applyPhoto],
  );

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ─── Submit ────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (!isValid || submitting) return;

      setError("");
      setSubmitting(true);

      write(witness);

      const payload: ManualSubmitPayload = {
        category,
        fieldValues,
        items,
        otherMode: category === "others" ? otherMode : "flat",
        totalAmount: total,
        witness: witness.trim(),
        photoFile,
        justification: justification.trim() || "",
      };

      if (category === "transportation") payload.route = fieldValues.route ?? "";
      if (category === "meals") payload.occasion = fieldValues.occasion ?? "";
      if (category === "honorarium") payload.recipient = fieldValues.recipient ?? "";

      try {
        await onSubmit(payload);
      } catch {
        setError("Failed to submit. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      isValid,
      submitting,
      write,
      witness,
      category,
      fieldValues,
      items,
      otherMode,
      total,
      photoFile,
      justification,
      onSubmit,
    ],
  );

  // ─── Field helpers ─────────────────────────────────────────────

  const updateField = useCallback(
    (key: string, value: any) => {
      setFieldValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /** Returns the error message for a field key, or undefined if no error. */
  const getFieldError = useCallback(
    (key: string): string | undefined => {
      if (!submitted) return undefined;
      const val = fieldValues[key];
      if (val === undefined || val === null || val === "") return "Required";
      if (typeof val === "number" && val <= 0) return "Required";
      return undefined;
    },
    [submitted, fieldValues],
  );

  const renderToggle = useCallback(
    (key: string, label: string) => {
      const active = fieldValues[key] === true;
      return (
        <div key={key} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateField(key, !active)}
            className={cn(
              "relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors",
              active ? "bg-accent" : "bg-border-strong",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                active ? "translate-x-[18px]" : "translate-x-[2px]",
              )}
            />
          </button>
          <span className="text-sm text-text-primary">{label}</span>
        </div>
      );
    },
    [fieldValues, updateField],
  );

  // ─── Render ────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent">
          <config.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">
            {config.label}
          </h3>
          <p className="text-xs text-text-muted">
            Fill in the details below
          </p>
        </div>
      </div>

      {/* ── Section: Trip Details ── */}

      <div className="flex flex-col gap-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Trip Details
        </p>

        {/* Transportation: Route + Fare + Passengers + Round-trip toggle + optional multi-trip */}
        {category === "transportation" && (
          <div className="flex flex-col gap-5">
            <FloatingInput
              label="Route"
              value={fieldValues.route ?? ""}
              onChange={(v) => updateField("route", v)}
              placeholder=" "
              error={getFieldError("route")}
            />
            <FloatingInput
              label="Fare per person"
              value={fieldValues.fare ?? ""}
              onChange={(v) => updateField("fare", typeof v === "string" ? 0 : v)}
              prefix="₱"
              inputMode="decimal"
              placeholder=" "
              error={getFieldError("fare")}
            />
            <FloatingInput
              label="Passengers"
              type="number"
              value={fieldValues.passengers ?? ""}
              onChange={(v) => updateField("passengers", v)}
              placeholder=" "
              min={0}
              error={getFieldError("passengers")}
            />

            {renderToggle("roundTrip", "Round-trip")}

            {/* Multi-trip override — shown directly when round-trip is toggled */}
            {fieldValues.roundTrip && (
              <FloatingInput
                label="How many one-way rides total?"
                type="number"
                value={fieldValues.trips ?? ""}
                onChange={(v) => updateField("trips", v)}
                placeholder=" "
                min={0}
              />
            )}
          </div>
        )}

        {/* Meals: Occasion text + Rate + Headcount */}
        {category === "meals" && (
          <div className="flex flex-col gap-5">
            <FloatingInput
              label="Occasion"
              value={fieldValues.occasion ?? ""}
              onChange={(v) => updateField("occasion", v)}
              placeholder=" "
              error={getFieldError("occasion")}
            />
            <FloatingInput
              label="Per-head Rate"
              value={fieldValues.rate ?? ""}
              onChange={(v) => updateField("rate", typeof v === "string" ? 0 : v)}
              prefix="₱"
              inputMode="decimal"
              suffix={config.fields[0].suffix}
              placeholder=" "
              error={getFieldError("rate")}
            />
            <FloatingInput
              label="Headcount"
              type="number"
              value={fieldValues.headcount ?? ""}
              onChange={(v) => updateField("headcount", v)}
              suffix={config.fields[1].suffix}
              placeholder=" "
              min={0}
              error={getFieldError("headcount")}
            />
          </div>
        )}

        {/* Honorarium: Recipient text + Amount */}
        {category === "honorarium" && (
          <div className="flex flex-col gap-5">
            <FloatingInput
              label="Recipient Name"
              value={fieldValues.recipient ?? ""}
              onChange={(v) => updateField("recipient", v)}
              placeholder=" "
              error={getFieldError("recipient")}
            />
            <FloatingInput
              label="Amount"
              value={fieldValues.amount ?? ""}
              onChange={(v) => updateField("amount", typeof v === "string" ? 0 : v)}
              prefix="₱"
              inputMode="decimal"
              placeholder=" "
              error={getFieldError("amount")}
            />
          </div>
        )}

        {/* Printing: Rate + Pages + Copies */}
        {category === "printing" && (
          <div className="flex flex-col gap-5">
            <FloatingInput
              label="Rate per page"
              value={fieldValues.rate ?? ""}
              onChange={(v) => updateField("rate", typeof v === "string" ? 0 : v)}
              prefix="₱"
              inputMode="decimal"
              suffix={config.fields[0].suffix}
              placeholder=" "
              error={getFieldError("rate")}
            />
            <FloatingInput
              label="Pages"
              type="number"
              value={fieldValues.pages ?? ""}
              onChange={(v) => updateField("pages", v)}
              suffix={config.fields[1].suffix}
              placeholder=" "
              min={0}
              error={getFieldError("pages")}
            />
            <FloatingInput
              label="Copies"
              type="number"
              value={fieldValues.copies ?? ""}
              onChange={(v) => updateField("copies", v)}
              suffix={config.fields[2].suffix}
              placeholder=" "
              min={0}
              error={getFieldError("copies")}
            />
          </div>
        )}

        {/* Rental: Rate + Days */}
        {category === "rental" && (
          <div className="flex flex-col gap-5">
            <FloatingInput
              label="Daily Rate"
              value={fieldValues.rate ?? ""}
              onChange={(v) => updateField("rate", typeof v === "string" ? 0 : v)}
              prefix="₱"
              inputMode="decimal"
              suffix={config.fields[0].suffix}
              placeholder=" "
              error={getFieldError("rate")}
            />
            <FloatingInput
              label="Days"
              type="number"
              value={fieldValues.days ?? ""}
              onChange={(v) => updateField("days", v)}
              suffix={config.fields[1].suffix}
              placeholder=" "
              min={0}
              error={getFieldError("days")}
            />
          </div>
        )}

        {/* Supplies: Dynamic item rows */}
        {category === "supplies" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2.5"
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    placeholder="Item description"
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface-secondary px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={item.qty || ""}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "qty",
                        Math.max(0, Number(e.target.value) || 0),
                      )
                    }
                    placeholder="Qty"
                    className="w-16 rounded-md border border-border bg-surface-secondary px-2 py-1.5 text-sm tabular-nums text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <div className="relative w-24">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                      ₱
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        item.price ? formatNumberInput(String(item.price)) : ""
                      }
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "price",
                          Math.max(0, Number(e.target.value.replace(/,/g, "")) || 0),
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-md border border-border bg-surface-secondary px-2 py-1.5 pl-5 text-sm tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:bg-error-lightest hover:text-error"
                    aria-label="Remove item"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
          </div>
        )}

        {/* Other: Sub-mode picker + fields */}
        {category === "others" && (
          <div className="flex flex-col gap-5">
            {/* Sub-mode pills */}
            <div className="flex gap-2">
              {(["flat", "itemized"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOtherMode(mode)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                    otherMode === mode
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "border border-border bg-surface text-text-secondary hover:border-accent hover:text-text-primary",
                  )}
                >
                  {mode === "flat" ? "Flat Amount" : "Itemized"}
                </button>
              ))}
            </div>

            {/* Flat Amount */}
            {otherMode === "flat" && (
              <FloatingInput
                label="Total Amount"
                value={fieldValues.amount ?? ""}
                onChange={(v) => updateField("amount", typeof v === "string" ? 0 : v)}
                prefix="₱"
                inputMode="decimal"
                placeholder=" "
                error={submitted && !justification.trim() ? "Justification is required" : getFieldError("amount")}
              />
            )}

            {/* Itemized (same as Supplies) */}
            {otherMode === "itemized" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2.5"
                    >
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="Item description"
                        className="min-w-0 flex-1 rounded-md border border-border bg-surface-secondary px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.qty || ""}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "qty",
                            Math.max(0, Number(e.target.value) || 0),
                          )
                        }
                        placeholder="Qty"
                        className="w-16 rounded-md border border-border bg-surface-secondary px-2 py-1.5 text-sm tabular-nums text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                      <div className="relative w-24">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                          ₱
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            item.price
                              ? formatNumberInput(String(item.price))
                              : ""
                          }
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "price",
                              Math.max(
                                0,
                                Number(e.target.value.replace(/,/g, "")) || 0,
                              ),
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded-md border border-border bg-surface-secondary px-2 py-1.5 pl-5 text-sm tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:bg-error-lightest hover:text-error"
                        aria-label="Remove item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section: Extra Information ── */}
      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Extra Information
        </p>

        {/* Witness (required) */}
        <FloatingInput
          label="Witness"
          name="witness"
          value={witness}
          onChange={(v) => setWitness(typeof v === "number" ? "" : v)}
          icon={Users}
          placeholder=" "
          required
          error={submitted && !witness.trim() ? "Required" : undefined}
        />

        {suggestedNames && witness !== suggestedNames && (
          <button
            type="button"
            onClick={applySuggestion}
            className="self-start rounded-md bg-accent-muted px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent-light"
          >
            Same as last time: {suggestedNames}? <span className="font-medium underline">Use</span>
          </button>
        )}

        {/* Photo attachment (always visible, optional) */}
        <div className="flex items-center gap-3">
          {!photoFile ? (
            <>
              {/* Desktop — single library picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary md:inline-flex"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach screenshot (optional)
              </button>
              {/* Mobile — camera + library pair */}
              <div className="flex gap-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  <Image className="h-3.5 w-3.5" />
                  Choose from Library
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Screenshot"
                  className="h-10 w-10 rounded-md object-cover"
                />
              )}
              <span className="max-w-[160px] truncate text-xs text-text-primary">
                {photoFile.name}
              </span>
              <button
                type="button"
                onClick={clearPhoto}
                className="ml-auto flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-error-lightest hover:text-error"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handlePhotoSelect}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── Section: Additional Details ── */}
      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Additional Details
        </p>

        {/* Justification (collapsed, optional — required for Other) */}
        <div>
          <button
            type="button"
            onClick={() => setShowJustification(!showJustification)}
            className="flex w-full items-center justify-between text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            <span>
              Justification / Purpose
              {category === "others" && <span className="ml-0.5 text-error">*</span>}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showJustification && "rotate-180",
              )}
            />
          </button>
          {showJustification && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pt-2"
            >
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={
                  category === "others"
                    ? "Explain why this expense doesn't fit other categories…"
                    : "Optional: provide additional context for this expense"
                }
                rows={2}
                className="w-full resize-none rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </motion.div>
          )}
        </div>

        {/* Error */}
        {error && <p className="text-sm text-error">{error}</p>}
      </div>

      {/* ── Live total ── */}
      <div className="flex items-center justify-between rounded-lg border border-border-strong bg-surface-secondary px-4 py-3">
        <span className="text-xs font-medium text-text-muted">Total</span>
        <span className="text-lg font-semibold tabular-nums text-text-primary">
          {formatPHP(total)}
        </span>
      </div>

      {/* ── Live formula hint ── */}
      {parts.length > 0 && (
        <p className="-mt-3 text-xs text-text-muted">
          {parts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1">×</span>}
              {part}
            </span>
          ))}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Submitting…" : "Submit for Approval"}
      </button>

      <p className="text-center text-xs text-text-muted">
        This entry will be reviewed by your department adviser before it is deducted from the budget.
      </p>

      {/* Full-screen camera — portaled to document.body */}
      {showCamera && (
        <CameraViewfinder
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          onUseLibrary={() => fileInputRef.current?.click()}
        />
      )}
    </form>
  );
}
