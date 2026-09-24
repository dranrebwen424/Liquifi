import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  KeyRound,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { AccountStatusBadge, RoleBadge } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { AccountStatus, Role } from "@/types";

type DbProfile = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  role: Role;
  account_status: AccountStatus;
  created_at: string;
  departments: { name: string; code: string } | null;
};

function fullName(profile: DbProfile): string {
  return [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(" ");
}

function initials(profile: DbProfile): string {
  return (
    [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join("") ||
    profile.email[0]
  ).toUpperCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      <dt className="flex min-w-0 flex-1 items-center gap-3 text-sm text-text-secondary">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-text-muted">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {label}
      </dt>
      <dd className="max-w-[58%] break-words text-right text-sm font-medium text-text-primary">
        {children}
      </dd>
    </div>
  );
}

export async function ProfileView({ role }: { role: Role }) {
  const user = await requireRole(role);
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("users")
    .select(
      "first_name, middle_name, last_name, email, role, account_status, created_at, departments(name, code)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) console.error("[ProfileView]", error);
  if (error || !data) notFound();

  const profile = data as unknown as DbProfile;
  const backHref =
    role === "admin"
      ? "/admin/departments"
      : role === "adviser"
        ? "/adviser/home"
        : "/treasurer/home";
  const roleLabel = profile.role[0].toUpperCase() + profile.role.slice(1);
  const statusLabel = profile.account_status.replace(/_/g, " ");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8">
      <Link
        href={backHref}
        aria-label="Back to previous page"
        className="flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="h-24 bg-surface-inverse sm:h-28" aria-hidden="true" />
        <div className="absolute left-1/2 top-12 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-surface bg-accent-light text-2xl font-semibold text-accent sm:top-14">
          {initials(profile)}
        </div>
        <div className="flex flex-col items-center px-5 pb-6 pt-16 text-center">
          <h1 className="break-words text-2xl font-semibold leading-8 text-text-primary">
            {fullName(profile)}
          </h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-2 text-xs font-medium text-text-primary">
              <span aria-hidden="true">
                <RoleBadge role={profile.role} />
              </span>
              {roleLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-2 text-xs font-medium capitalize text-text-primary">
              <span aria-hidden="true">
                <AccountStatusBadge status={profile.account_status} />
              </span>
              {statusLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
            General information
          </h2>
        </div>
        <dl>
          <DetailRow icon={Mail} label="Email address">
            {profile.email}
          </DetailRow>
          <DetailRow icon={Building2} label="Department">
            {profile.departments?.name ?? "Administration"}
          </DetailRow>
          <DetailRow icon={Building2} label="Department code">
            {profile.departments?.code ?? "System-wide"}
          </DetailRow>
          <DetailRow icon={CalendarDays} label="Joined">
            <time dateTime={profile.created_at}>{formatDate(profile.created_at)}</time>
          </DetailRow>
        </dl>
      </section>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl text-sm font-medium text-text-primary"
      >
        <KeyRound aria-hidden="true" />
        Change password
      </Button>

      {role === "admin" && (
        <div className="lg:hidden">
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
