"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterOption = { value: string; label: string };

type Props = {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function FilterDropdown({ label, options, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep active index synced with value
  useEffect(() => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [value, options]);

  const selected = options.find((o) => o.value === value);
  const isActive = value !== options[0]?.value; // first option is always "All"

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
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm",
          isActive
            ? "border-accent bg-accent-muted text-accent"
            : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        )}
      >
        <span className="whitespace-nowrap">{selected?.label ?? label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 min-w-40 origin-top overflow-hidden rounded-lg border border-border-strong bg-surface py-1 shadow-card sm:w-44"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={cn(
                "cursor-pointer whitespace-nowrap px-3 py-2 text-sm transition-colors",
                o.value === value
                  ? "bg-accent-muted font-medium text-accent"
                  : i === active
                    ? "bg-surface-secondary text-text-primary"
                    : "text-text-primary",
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
