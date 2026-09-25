import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LogoutButton } from "@/components/profile/LogoutButton";
import ChangePasswordButton from "@/components/profile/ChangePasswordButton";
import AvatarUploader from "@/components/profile/AvatarUploader";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getAvatarUrl } from "@/lib/storage";
import { ROLE_HOME } from "@/lib/profile-routes";
import type { AccountStatus, Role } from "@/types";

type DbProfile = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  role: Role;
  account_status: AccountStatus;
  avatar_key: string | null;
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
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-4 sm:px-5">
      <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-text-primary">
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
      "first_name, middle_name, last_name, email, role, account_status, avatar_key, created_at, departments(name, code)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) console.error("[ProfileView]", error);
  if (error || !data) notFound();

  const profile = data as unknown as DbProfile;
  const avatarUrl = profile.avatar_key ? await getAvatarUrl(profile.avatar_key) : null;
  const homeHref = ROLE_HOME[role];
  const roleLabel = profile.role[0].toUpperCase() + profile.role.slice(1);
  const statusLabel = profile.account_status.replace(/_/g, " ");
  const roleStyle = {
    admin: "bg-role-admin-light text-role-admin",
    adviser: "bg-role-adviser-light text-info-dark",
    treasurer: "bg-role-treasurer-light text-success-dark",
  }[profile.role];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col pb-8">
      <header className="relative flex h-11 items-center justify-center">
        <Link
          href={homeHref}
          aria-label="Back to home"
          className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Profile</h1>
      </header>

      <section aria-label="Your profile" className="flex flex-col items-center pb-7 pt-5 text-center">
        <AvatarUploader
          avatarUrl={avatarUrl}
          initials={initials(profile)}
          hasAvatar={Boolean(avatarUrl)}
        />
        <h2 className="mt-5 max-w-full break-words text-lg font-semibold leading-7 text-text-primary">
          {fullName(profile) || profile.email}
        </h2>
        <p className="mt-1 max-w-full break-all text-xs leading-5 text-text-secondary">{profile.email}</p>
        <span className={`mt-4 rounded-md px-3 py-1 text-xs font-medium ${roleStyle}`}>
          {roleLabel}
        </span>
      </section>

      <section aria-labelledby="account-details-heading">
        <h2 id="account-details-heading" className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
          Account details
        </h2>
        <dl className="flex flex-col gap-3">
          <DetailRow label="Department">
            <span className="flex items-start justify-between gap-4">
              <span>{profile.departments?.name ?? "Administration"}</span>
              {profile.departments?.code && <span className="shrink-0 text-xs leading-6 text-text-secondary">{profile.departments.code}</span>}
            </span>
          </DetailRow>
          <DetailRow label="Joined">
            <time dateTime={profile.created_at}>{formatDate(profile.created_at)}</time>
          </DetailRow>
          <DetailRow label="Account status">
            <span className="capitalize">{statusLabel}</span>
          </DetailRow>
        </dl>
      </section>

      <section aria-labelledby="preferences-heading" className="mt-7">
        <h2 id="preferences-heading" className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
          Preferences
        </h2>
        <div className="flex flex-col gap-3">
          <ChangePasswordButton />
          {role === "admin" && (
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
