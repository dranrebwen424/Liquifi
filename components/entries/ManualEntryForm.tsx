"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Bus,
  UtensilsCrossed,
  Package,
  Printer,
  CalendarDays,
  Award,
  Ellipsis,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────

export type ExpenseType =
  | "transportation"
  | "meals"
  | "supplies"
  | "printing"
  | "rental"
  | "honorarium"
  | "others";

export type ManualEntryData = {
  expenseType: ExpenseType;
  activityName: string;
  dateIncurred: string;
  description: string;
  computeValues: Record<string, number>;
  totalAmount: number;
};

type ComputeField = {
  key: string;
  label: string;
  suffix: string;
  inputType: "currency" | "number";
  placeholder?: string;
};

type ExpenseTypeConfig = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  fields: ComputeField[];
  /** Returns the total amount and human-readable formula parts */
  compute: (values: Record<string, number>) => { total: number; parts: string[] };
};

// ─── Expense type configs ──────────────────────────────────────────

const EXPENSE_TYPES: Record<ExpenseType, ExpenseTypeConfig> = {
  transportation: {
    icon: Bus,
    label: "Transportation",
    fields: [
      { key: "rate", label: "Rate", suffix: "per person", inputType: "currency", placeholder: "0.00" },
      { key: "persons", label: "Persons", suffix: "persons", inputType: "number", placeholder: "0" },
      { key: "trips", label: "Trips", suffix: "trips", inputType: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = v.rate ?? 0;
      const p = v.persons ?? 0;
      const t = v.trips ?? 0;
      return {
        total: r * p * t,
        parts: [`${formatPHP(r)}`, `${p} person${p !== 1 ? "s" : ""}`, `${t} trip${t !== 1 ? "s" : ""}`],
      };
    },
  },
  meals: {
    icon: UtensilsCrossed,
    label: "Meals",
    fields: [
      { key: "rate", label: "Amount/head", suffix: "per person", inputType: "currency", placeholder: "0.00" },
      { key: "persons", label: "Persons", suffix: "persons", inputType: "number", placeholder: "0" },
      { key: "days", label: "Days", suffix: "days", inputType: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = v.rate ?? 0;
      const p = v.persons ?? 0;
      const d = v.days ?? 0;
      return {
        total: r * p * d,
        parts: [`${formatPHP(r)}`, `${p} person${p !== 1 ? "s" : ""}`, `${d} day${d !== 1 ? "s" : ""}`],
      };
    },
  },
  supplies: {
    icon: Package,
    label: "Supplies",
    fields: [
      { key: "unitPrice", label: "Unit Price", suffix: "per unit", inputType: "currency", placeholder: "0.00" },
      { key: "quantity", label: "Quantity", suffix: "units", inputType: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const u = v.unitPrice ?? 0;
      const q = v.quantity ?? 0;
      return {
        total: u * q,
        parts: [`${formatPHP(u)}`, `${q} unit${q !== 1 ? "s" : ""}`],
      };
    },
  },
  printing: {
    icon: Printer,
    label: "Printing",
    fields: [
      { key: "rate", label: "Rate/page", suffix: "per page", inputType: "currency", placeholder: "0.00" },
      { key: "pages", label: "Pages", suffix: "pages", inputType: "number", placeholder: "0" },
      { key: "copies", label: "Copies", suffix: "copies", inputType: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = v.rate ?? 0;
      const p = v.pages ?? 0;
      const c = v.copies ?? 0;
      return {
        total: r * p * c,
        parts: [`${formatPHP(r)}`, `${p} page${p !== 1 ? "s" : ""}`, `${c} cop${c !== 1 ? "ies" : "y"}`],
      };
    },
  },
  rental: {
    icon: CalendarDays,
    label: "Rental",
    fields: [
      { key: "rate", label: "Daily Rate", suffix: "per day", inputType: "currency", placeholder: "0.00" },
      { key: "days", label: "Days", suffix: "days", inputType: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = v.rate ?? 0;
      const d = v.days ?? 0;
      return {
        total: r * d,
        parts: [`${formatPHP(r)}`, `${d} day${d !== 1 ? "s" : ""}`],
      };
    },
  },
  honorarium: {
    icon: Award,
    label: "Honorarium",
    fields: [
      { key: "amount", label: "Amount", suffix: "", inputType: "currency", placeholder: "0.00" },
    ],
    compute: (v) => ({
      total: v.amount ?? 0,
      parts: [],
    }),
  },
  others: {
    icon: Ellipsis,
    label: "Others",
    fields: [
      { key: "amount", label: "Total Amount", suffix: "", inputType: "currency", placeholder: "0.00" },
    ],
    compute: (v) => ({
      total: v.amount ?? 0,
      parts: [],
    }),
  },
};

// ─── Component ─────────────────────────────────────────────────────

type ManualEntryFormProps = {
  onSubmit?: (data: ManualEntryData) => Promise<void>;
};

export function ManualEntryForm({ onSubmit }: ManualEntryFormProps) {
  // Basic info
  const [activityName, setActivityName] = useState("");
  const [dateIncurred, setDateIncurred] = useState("");
  const [description, setDescription] = useState("");

  // Expense type
  const [expenseType, setExpenseType] = useState<ExpenseType | null>(null);

  // Compute field values — shared across all types
  const [computeValues, setComputeValues] = useState<Record<string, number>>({});

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ─── Derived ───────────────────────────────────────────────────

  const config = expenseType ? EXPENSE_TYPES[expenseType] : null;

  const { total, parts } = useMemo(() => {
    if (!config) return { total: 0, parts: [] as string[] };
    return config.compute(computeValues);
  }, [config, computeValues]);

  const updateCompute = useCallback((key: string, raw: string) => {
    setComputeValues((prev) => ({ ...prev, [key]: Math.max(0, Number(raw) || 0) }));
  }, []);

  const resetCompute = useCallback(() => {
    setComputeValues({});
  }, []);

  // ─── Submit ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!activityName.trim()) {
        setError("Activity / event name is required.");
        return;
      }
      if (!dateIncurred) {
        setError("Date incurred is required.");
        return;
      }
      if (!expenseType) {
        setError("Select an expense type.");
        return;
      }

      // Validate that required compute fields are filled
      const cfg = EXPENSE_TYPES[expenseType];
      const allFilled = cfg.fields.every((f) => (computeValues[f.key] ?? 0) > 0);
      if (!allFilled && expenseType !== "honorarium" && expenseType !== "others") {
        setError(`Fill in all compute fields for ${cfg.label.toLowerCase()}.`);
        return;
      }
      if ((expenseType === "honorarium" || expenseType === "others") && !computeValues.amount) {
        setError("Enter the total amount.");
        return;
      }

      const data: ManualEntryData = {
        expenseType,
        activityName: activityName.trim(),
        dateIncurred,
        description: description.trim(),
        computeValues,
        totalAmount: total,
      };

      setSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(data);
        } else {
          await new Promise((r) => setTimeout(r, 600));
        }
      } catch {
        setError("Failed to submit entry. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [activityName, dateIncurred, description, expenseType, computeValues, total, onSubmit],
  );

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basic Info */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Basic Info
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Activity / Event Name" required>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="e.g. Buwan ng Wika Celebration"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </FormField>
          <FormField label="Date Incurred" required>
            <input
              type="date"
              value={dateIncurred}
              onChange={(e) => setDateIncurred(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </FormField>
        </div>
        <FormField label="Brief Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this expense…"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </FormField>
      </div>

      {/* Expense Type — Icon Card Grid */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Expense Type
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {(Object.entries(EXPENSE_TYPES) as [ExpenseType, ExpenseTypeConfig][]).map(
            ([key, cfg]) => {
              const Icon = cfg.icon;
              const active = expenseType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setExpenseType(key);
                    resetCompute();
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border py-5 text-center transition-all",
                    active
                      ? "border-accent bg-accent-muted ring-1 ring-accent"
                      : "border-border bg-surface hover:border-accent hover:bg-accent-muted",
                  )}
                >
                  <Icon className="h-6 w-6 text-accent" />
                  <span className="text-xs font-medium text-text-primary">
                    {cfg.label}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Compute Fields — conditional per type */}
      {expenseType && config && config.fields.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {config.label}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {config.fields.map((f) => (
              <FormField key={f.key} label={f.label}>
                <div className="relative">
                  {f.inputType === "currency" && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                      ₱
                    </span>
                  )}
                  <input
                    type="number"
                    min="0"
                    step={f.inputType === "currency" ? "0.01" : "1"}
                    value={computeValues[f.key] ? String(computeValues[f.key]) : ""}
                    onChange={(e) => updateCompute(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={cn(
                      "w-full rounded-lg border border-border bg-surface py-2.5 text-sm tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent",
                      f.inputType === "currency" ? "pl-7 pr-3" : "px-3",
                    )}
                  />
                </div>
                {f.suffix && (
                  <p className="mt-0.5 text-[11px] text-text-muted">{f.suffix}</p>
                )}
              </FormField>
            ))}
          </div>

          {/* Live formula breakdown */}
          {total > 0 && (
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-secondary px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-text-muted">
                  {parts.length > 0 ? (
                    <>
                      {parts.map((part, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1 text-text-muted">×</span>}
                          <span className="font-medium text-text-primary">{part}</span>
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="font-medium text-text-primary">
                      {formatPHP(total)}
                    </span>
                  )}
                </span>
                {parts.length > 0 && (
                  <span className="shrink-0 text-base font-semibold tabular-nums text-text-primary">
                    {formatPHP(total)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Submitting…" : "Submit for Approval"}
      </button>

      <p className="text-center text-xs text-text-muted">
        This entry will be reviewed by your department adviser before it is deducted from the budget.
      </p>
    </form>
  );
}

// ─── Form Field Wrapper ──────────────────────────────────────────

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
    </div>
  );
}
