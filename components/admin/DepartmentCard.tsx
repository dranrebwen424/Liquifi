"use client";

import Link from "next/link";
import { Building2, BookOpen, Landmark, ChevronRight } from "lucide-react";
import type { DepartmentSummary } from "@/lib/admin-departments";

type Props = {
  department: DepartmentSummary;
};

export function DepartmentCard({ department }: Props) {
  return (
    <Link
      href={`/admin/departments/${department.id}`}
      prefetch
      className="group flex min-h-[150px] flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-border-strong active:scale-[0.99] active:bg-surface-inverse md:min-h-[220px]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-text-primary group-active:bg-nav-active group-active:text-text-inverse">
          <Building2 className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 text-base font-semibold text-text-primary group-active:text-text-inverse">
            {department.name}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted">
            {department.code} · {department.is_active ? "Active" : "Inactive"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-text-muted md:hidden" />
      </div>
      <div className="mt-auto grid gap-2 border-t border-border-light pt-3 text-xs group-active:border-nav-border">
        <span className="flex items-center gap-2 text-text-secondary group-active:text-text-inverse">
          <BookOpen className="h-4 w-4" /> Adviser: {department.adviser ?? "Not assigned"}
        </span>
        <span className="flex items-center gap-2 text-text-secondary group-active:text-text-inverse">
          <Landmark className="h-4 w-4" /> Treasurer: {department.treasurer ?? "Not assigned"}
        </span>
      </div>
    </Link>
  );
}
