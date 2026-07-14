"use client";

import { useRef } from "react";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Display name for the error notice (defaults to "verification code"). */
  name?: string;
  autoComplete?: string;
  error?: boolean;
};

export default function AuthOtpInput({
  length = 6,
  value,
  onChange,
  name = "verification code",
  autoComplete = "one-time-code",
  error = false,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusBox = (i: number) => {
    const el = refs.current[i];
    el?.focus();
    el?.select();
  };

  const commit = (next: string[]) => onChange(next.join("").slice(0, length));

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    const next = digits.slice();
    if (!d) {
      next[i] = "";
      commit(next);
      return;
    }
    if (d.length > 1) {
      // autofill / paste into a single box — distribute across boxes
      const chars = d.slice(0, length).split("");
      chars.forEach((c, k) => (next[k] = c));
      commit(next);
      focusBox(Math.min(chars.length, length - 1));
      return;
    }
    next[i] = d;
    commit(next);
    if (i < length - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice();
      if (next[i]) {
        next[i] = "";
        commit(next);
      } else if (i > 0) {
        next[i - 1] = "";
        commit(next);
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    const next = digits.slice();
    text.split("").forEach((c, k) => (next[k] = c));
    commit(next);
    focusBox(Math.min(text.length, length - 1));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            inputMode="numeric"
            autoComplete={i === 0 ? autoComplete : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={error}
            className={`h-14 w-12 rounded-lg border bg-surface text-center text-xl font-semibold text-text-primary outline-none transition-colors ${
              error
                ? "border-error focus:border-error focus:ring-1 focus:ring-error"
                : "border-border-strong focus:border-accent focus:ring-1 focus:ring-accent"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          Please enter your {name}.
        </p>
      )}
    </div>
  );
}
