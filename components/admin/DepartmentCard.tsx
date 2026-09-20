"use client";

import Link from "next/link";
import { Folder, Check } from "lucide-react";
import type { DepartmentSummary } from "@/lib/admin-departments";

type Props = {
  department: DepartmentSummary;
};

export function DepartmentCard({ department }: Props) {
  return (
    <Link
      href={`/admin/departments/${department.id}`}
      prefetch
      className="group flex h-full min-h-[220px] w-full flex-col rounded-[24px] border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_8px_30px_-8px_rgba(17,17,20,0.12)]"
    >
      {/* Top row: folder icon + active mark */}
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary text-text-muted transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-foreground">
          <Folder className="h-4 w-4" />
        </div>
        {department.is_active && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-3 w-3" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Department name + code */}
      <div className="mt-5">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text-primary">
          {department.name}
        </h3>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          {department.code}
        </p>
      </div>

      {/* Adviser / Treasurer */}
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Adviser</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-text-secondary">
            {department.adviser ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Treasurer</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-text-secondary">
            {department.treasurer ?? "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}