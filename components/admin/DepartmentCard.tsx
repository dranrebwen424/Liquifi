"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DepartmentSummary } from "@/lib/admin-departments";

type Props = {
  department: DepartmentSummary;
};

export function DepartmentCard({ department }: Props) {
  return (
    <Link
      href={`/admin/departments/${department.id}`}
      prefetch
      className="group flex min-h-32 w-full flex-col rounded-lg border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-48 md:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-text-muted">
            {department.code}
          </p>
          <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-text-primary md:text-lg">
            {department.name}
          </h2>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-text-primary transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-foreground">
          <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-7 text-xs text-text-muted">
        <p className="truncate">
          Treasurer: <span className="font-semibold text-text-primary">{department.treasurer ?? "—"}</span>
        </p>
        <p className="truncate">
          Adviser: <span className="font-semibold text-text-primary">{department.adviser ?? "—"}</span>
        </p>
      </div>
    </Link>
  );
}
