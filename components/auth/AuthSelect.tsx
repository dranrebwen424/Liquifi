"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  name?: string;
  required?: boolean;
  error?: boolean;
};

export default function AuthSelect({
  id,
  label,
  value,
  onChange,
  options,
  name,
  required,
  error = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[active].value);
    }
  };

  return (
    <div className="relative flex flex-col gap-2" ref={wrapRef}>
      <div className="relative">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-between rounded-lg border bg-surface pb-2 pl-4 pr-10 pt-6 text-left text-sm text-text-primary outline-none transition-colors ${
            error
              ? "border-error focus:border-error focus:ring-1 focus:ring-error"
              : "border-border-strong focus:border-accent focus:ring-1 focus:ring-accent"
          }`}
        >
          <span className="truncate">{selected ? selected.label : ""}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-4 top-2 origin-left text-xs ${
            error ? "text-error" : "text-text-muted"
          }`}
        >
          {label}
          {required && <span className="text-error"> *</span>}
        </label>

        {open && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1 w-full origin-top overflow-hidden rounded-lg border border-border-strong bg-surface py-1 shadow-card"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`cursor-pointer px-4 py-2 text-sm transition-colors ${
                  o.value === value
                    ? "bg-accent-muted font-medium text-accent"
                    : i === active
                      ? "bg-surface-secondary text-text-primary"
                      : "text-text-primary"
                }`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="text-sm text-error" role="alert">
          Please enter your {name ?? label}.
        </p>
      )}
    </div>
  );
}
