"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────

type FloatingInputProps = {
  /** Field label — shown inside the box at rest, floats to the top-left on focus/type. */
  label: string;
  /** Display name for the error notice (defaults to label). */
  name?: string;
  type?: "text" | "number";
  inputMode?: "decimal" | "numeric" | "text";
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  /** Suffix text shown below input (e.g. "per person"). */
  suffix?: string;
  /** Prefix shown inside the input (e.g. "₱"). */
  prefix?: string;
  /** Optional icon shown inside the input (e.g. Users for witness field). */
  icon?: LucideIcon;
  min?: number;
  step?: number;
  required?: boolean;
  /** Error message — when truthy, shows red border + message below. */
  error?: string;
};

// ─── Component ─────────────────────────────────────────────────────

export function FloatingInput({
  label,
  name,
  type = "text",
  inputMode,
  value,
  onChange,
  placeholder = " ",
  suffix,
  prefix,
  icon: Icon,
  min,
  step,
  required,
  error,
}: FloatingInputProps) {
  const id = useId();
  const hasValue =
    typeof value === "number" ? value !== 0 : value !== "";
  const lowerName = (name ?? label ?? "").toLowerCase() || "this field";

  // Right padding reserves room for the trailing error badge when present.
  const rightPad = error ? "pr-10" : "pr-4";
  const leftPad = prefix ? "pl-7" : Icon ? "pl-10" : "pl-4";
  const labelLeft = prefix ? "left-7" : Icon ? "left-10" : "left-4";

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        )}
        {prefix && !Icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
            {prefix}
          </span>
        )}

        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => {
            if (type === "number") {
              onChange(Math.max(0, Number(e.target.value) || 0));
            } else {
              onChange(e.target.value);
            }
          }}
          placeholder={placeholder}
          min={min}
          step={step}
          required={required}
          aria-invalid={!!error}
          className={cn(
            "peer w-full rounded-lg border bg-surface pb-2 pt-6 text-sm text-text-primary outline-none transition-colors tabular-nums",
            leftPad,
            rightPad,
            error
              ? "border-error focus:border-error focus:ring-1 focus:ring-error"
              : "border-border-strong focus:border-accent focus:ring-1 focus:ring-accent",
          )}
        />

        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute z-10 origin-left text-sm transition-all duration-150",
            labelLeft,
            "top-1/2 -translate-y-1/2",
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-90 peer-focus:text-xs",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-xs",
            error ? "text-error" : "text-text-muted",
          )}
        >
          {label}
          {required && <span className="text-error"> *</span>}
        </label>

        {error && (
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center justify-center"
            aria-hidden
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-[11px] font-bold leading-none text-white">
              !
            </span>
          </span>
        )}
      </div>

      {suffix && (
        <span className="text-[11px] text-text-muted">{suffix}</span>
      )}

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
