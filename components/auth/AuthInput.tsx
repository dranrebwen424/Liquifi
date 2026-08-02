"use client";

import { useState } from "react";

type Props = {
  id: string;
  /** Field name — shown inside the box at rest, floats to the top-left on focus/type. */
  label: string;
  /** Display name for the error notice (defaults to label). */
  name?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email" | "tel";
  required?: boolean;
  error?: boolean;
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export default function AuthInput({
  id,
  label,
  name,
  type = "text",
  value,
  onChange,
  autoComplete,
  inputMode,
  required,
  error = false,
}: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const lowerName = name ?? label ?? "";
  const lowerNameText = lowerName ? lowerName.toLowerCase() : "this field";

  // Right padding reserves room for the trailing icon(s): eye (password) and,
  // when errored, the red "!" badge sits just left of the eye.
  const rightPad = isPassword ? (error ? "pr-16" : "pr-10") : error ? "pr-10" : "pr-4";

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          aria-invalid={error}
          className={`peer w-full rounded-lg border bg-surface pb-2 pl-4 pt-6 text-sm text-text-primary outline-none transition-colors ${rightPad} ${
            error
              ? "border-error focus:border-error focus:ring-1 focus:ring-error"
              : "border-border-strong focus:border-accent focus:ring-1 focus:ring-accent"
          }`}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-4 top-1/2 z-10 origin-left -translate-y-1/2 text-sm transition-all duration-150 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-90 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-xs ${
            error ? "text-error" : "text-text-muted"
          }`}
        >
          {label}
          {required && <span className="text-error"> *</span>}
        </label>

        {error && (
          <span
            className={`pointer-events-none absolute inset-y-0 ${isPassword ? "right-10" : "right-3"} flex items-center justify-center`}
            aria-hidden
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-[11px] font-bold leading-none text-white">
              !
            </span>
          </span>
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className={`absolute inset-y-0 right-3 z-20 flex items-center justify-center text-text-muted outline-none transition-colors hover:text-text-primary ${
              error ? "bg-surface" : ""
            }`}
          >
            <EyeIcon open={show} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          Please enter your {lowerNameText}.
        </p>
      )}
    </div>
  );
}
