"use client";

import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  children: ReactNode;
  variant?: Variant;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground rounded-full px-4 py-2 hover:bg-accent-hover",
  secondary:
    "bg-surface border border-border text-text-primary rounded-full px-4 py-2 hover:bg-surface-secondary hover:border-border-strong",
  ghost:
    "bg-transparent text-text-secondary rounded-md px-4 py-2 hover:bg-surface-secondary hover:text-text-primary",
};

export default function AuthButton({
  children,
  variant = "primary",
  type = "button",
  disabled,
  loading,
  onClick,
  className = "",
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
