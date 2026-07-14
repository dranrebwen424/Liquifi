"use client";

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
  const lowerName = name ?? label ?? "";
  const lowerNameText = lowerName ? lowerName.toLowerCase() : "this field";

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          aria-invalid={error}
          className={`peer w-full rounded-lg border bg-surface pb-2 pl-4 pr-10 pt-6 text-sm text-text-primary outline-none transition-colors ${
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
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center justify-center"
            aria-hidden
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-[11px] font-bold leading-none text-white">
              !
            </span>
          </span>
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
