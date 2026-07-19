"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
};

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
          value === "grid"
            ? "bg-accent text-accent-foreground"
            : "text-text-muted hover:text-text-primary",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
          value === "list"
            ? "bg-accent text-accent-foreground"
            : "text-text-muted hover:text-text-primary",
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
