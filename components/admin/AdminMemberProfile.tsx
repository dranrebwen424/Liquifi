"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CalendarCheck } from "lucide-react";
import { setUserAccountStatus } from "@/actions/departments";
import { AccountStatusBadge, RoleBadge } from "@/components/ui/StatusBadge";
import type { AccountStatus } from "@/types";

export type AdminDepartment = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

export type AdminMember = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: string;
  account_status: string;
  department_id: string;
  avatar_key?: string | null;
  approved_at: string | null;
};

export function AdminMemberProfile({
  department,
  member,
  avatarUrl,
}: {
  department: AdminDepartment;
  member: AdminMember;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accountStatus = member.account_status as AccountStatus;
  const nextStatus: AccountStatus | null =
    accountStatus === "active"
      ? "deactivated"
      : accountStatus === "deactivated"
        ? "active"
        : null;

  const fullName = [member.first_name, member.middle_name, member.last_name]
    .filter(Boolean)
    .join(" ");
  const initials = [member.first_name, member.last_name]
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fmtApproved = member.approved_at
    ? new Date(member.approved_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  async function submit(): Promise<void> {
    if (!nextStatus || busy) return;
    setBusy(true);
    setError("");
    const result = await setUserAccountStatus(member.id, department.id, nextStatus);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link
        href={`/admin/departments/${department.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to department
      </Link>

      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card md:flex-row md:items-start">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-light text-xl font-semibold text-accent">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="flex flex-1 flex-col items-center gap-1 text-center md:items-start md:text-left">
            <h1 className="text-xl font-semibold leading-7 text-text-primary md:text-2xl">
              {fullName}
            </h1>
            <div className="flex items-center gap-2">
              <RoleBadge role={member.role} />
              <AccountStatusBadge status={member.account_status} />
            </div>
            <p className="mt-1 break-all text-sm text-text-muted">{member.email}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <Building2 className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Department
              </p>
              <p className="text-sm font-semibold text-text-primary">{department.name}</p>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {department.code}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <CalendarCheck className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Approved
              </p>
              <p className="text-sm font-semibold text-text-primary">{fmtApproved}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {nextStatus === "deactivated" ? (
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-error px-6 py-3 text-sm font-semibold text-error transition-colors hover:bg-error-lightest disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Working…" : "Deactivate account"}
            </button>
          ) : nextStatus === "active" ? (
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border-strong bg-surface px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Working…" : "Reactivate account"}
            </button>
          ) : (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
              {accountStatus === "pending_approval"
                ? "This account is pending approval and cannot be actioned from here."
                : "This account was rejected and cannot be reactivated."}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}