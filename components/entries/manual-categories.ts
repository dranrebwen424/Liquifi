import {
  Bus,
  UtensilsCrossed,
  Award,
  Package,
  Printer,
  CalendarDays,
  Ellipsis,
} from "lucide-react";
import { formatPHP, toNumber } from "@/lib/format";

export type ExpenseType =
  | "transportation"
  | "meals"
  | "honorarium"
  | "supplies"
  | "printing"
  | "rental"
  | "others";

export type ComputeField = {
  key: string;
  label: string;
  suffix: string;
  type: "currency" | "number" | "text";
  placeholder?: string;
};

export type CategoryConfig = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  /** % of the event budget that is the "normal" ceiling for this category (Step 16 gate). */
  pctOfBudget: number;
  /** Absolute floor (₱) — protects small-budget events; gate = max(floor, budget × pct). */
  minCeiling: number;
  fields: ComputeField[];
  compute: (values: Record<string, number | string | boolean>) => { total: number; parts: string[] };
};

export const CATEGORIES: Record<ExpenseType, CategoryConfig> = {  transportation: {
    icon: Bus,
    label: "Transportation",
    hint: "Fare, passengers, round-trip or multi-trip",
    pctOfBudget: 20,
    minCeiling: 300,
    fields: [
      { key: "fare", label: "Fare", suffix: "per person", type: "currency", placeholder: "0.00" },
      { key: "passengers", label: "Passengers", suffix: "persons", type: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const fare = toNumber(v.fare ?? 0);
      const pax = toNumber(v.passengers ?? 0);
      const trips = toNumber(v.trips ?? 0);
      const multiplier = trips > 0 ? trips : v.roundTrip ? 2 : 1;
      return {
        total: fare * pax * multiplier,
        parts: [
          `${formatPHP(fare)}`,
          `${pax} person${pax !== 1 ? "s" : ""}`,
          trips > 0 ? `${trips} rides` : v.roundTrip ? "round-trip" : "one-way",
        ],
      };
    },
  },
  meals: {
    icon: UtensilsCrossed,
    label: "Meals",
    hint: "Per-head rate, headcount",
    pctOfBudget: 55,
    minCeiling: 500,
    fields: [
      { key: "rate", label: "Per-head Rate", suffix: "per person", type: "currency", placeholder: "0.00" },
      { key: "headcount", label: "Headcount", suffix: "persons", type: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = toNumber(v.rate ?? 0);
      const h = toNumber(v.headcount ?? 0);
      return {
        total: r * h,
        parts: [`${formatPHP(r)}`, `${h} person${h !== 1 ? "s" : ""}`],
      };
    },
  },
  honorarium: {
    icon: Award,
    label: "Honorarium",
    hint: "Recipient, amount",
    pctOfBudget: 45,
    minCeiling: 1000,
    fields: [
      { key: "amount", label: "Amount", suffix: "", type: "currency", placeholder: "0.00" },
    ],
    compute: (v) => ({ total: toNumber(v.amount ?? 0), parts: [] }),
  },
  supplies: {
    icon: Package,
    label: "Supplies",
    hint: "Item rows (qty × price)",
    pctOfBudget: 25,
    minCeiling: 500,
    fields: [],
    compute: () => ({ total: 0, parts: [] }), // computed inline from items array
  },
  printing: {
    icon: Printer,
    label: "Printing",
    hint: "Rate, pages, copies",
    pctOfBudget: 12,
    minCeiling: 300,
    fields: [
      { key: "rate", label: "Rate/page", suffix: "per page", type: "currency", placeholder: "0.00" },
      { key: "pages", label: "Pages", suffix: "pages", type: "number", placeholder: "0" },
      { key: "copies", label: "Copies", suffix: "copies", type: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = toNumber(v.rate ?? 0);
      const p = toNumber(v.pages ?? 0);
      const c = toNumber(v.copies ?? 0);
      return {
        total: r * p * c,
        parts: [
          `${formatPHP(r)}`,
          `${p} page${p !== 1 ? "s" : ""}`,
          `${c} cop${c !== 1 ? "ies" : "y"}`,
        ],
      };
    },
  },
  rental: {
    icon: CalendarDays,
    label: "Rental",
    hint: "Daily rate, days",
    pctOfBudget: 65,
    minCeiling: 1000,
    fields: [
      { key: "rate", label: "Daily Rate", suffix: "per day", type: "currency", placeholder: "0.00" },
      { key: "days", label: "Days", suffix: "days", type: "number", placeholder: "0" },
    ],
    compute: (v) => {
      const r = toNumber(v.rate ?? 0);
      const d = toNumber(v.days ?? 0);
      return {
        total: r * d,
        parts: [`${formatPHP(r)}`, `${d} day${d !== 1 ? "s" : ""}`],
      };
    },
  },
  others: {
    icon: Ellipsis,
    label: "Other",
    hint: "Flat amount or itemized",
    pctOfBudget: 20,
    minCeiling: 300,
    fields: [],
    compute: () => ({ total: 0, parts: [] }), // computed inline
  },
};

/**
 * Step 16 gate ceiling for a category, in cents:
 * `max(minCeiling, budget_total × pctOfBudget%)` — the floor protects
 * small-budget events from making every entry trigger the explanation gate.
 */
export function manualGateThresholdCents(budgetTotal: number, config: CategoryConfig): number {
  const budgetCents = Math.round(budgetTotal * 100);
  return Math.max(
    Math.round(config.minCeiling * 100),
    Math.round((budgetCents * config.pctOfBudget) / 100),
  );
}
