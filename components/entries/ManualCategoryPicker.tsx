"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CATEGORIES, type ExpenseType } from "@/components/entries/manual-categories";

type ManualCategoryPickerProps = {
  onSelect: (category: ExpenseType) => void;
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20, duration: 0.2 },
  },
};

export function ManualCategoryPicker({ onSelect }: ManualCategoryPickerProps) {
  const entries = useMemo(
    () => Object.entries(CATEGORIES) as [ExpenseType, (typeof CATEGORIES)[ExpenseType]][],
    [],
  );

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
      >
        {entries.map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <motion.button
              key={key}
              variants={item}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border border-border-strong bg-surface px-4 py-6 text-center transition-all",
                "hover:border-accent hover:bg-accent-muted hover:shadow-sm",
                "active:scale-[0.97]",
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-light text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-text-primary">
                {cfg.label}
              </span>
              <span className="text-[11px] leading-tight text-text-muted">
                {cfg.hint}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
