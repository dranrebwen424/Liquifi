import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { LogoutButton } from "@/components/profile/LogoutButton";

// Shared server view for the treasurer / adviser / admin profile pages.
// Read-only by design: shows the acting user's account info; mobile logout
// lives at the bottom of the page (desktop uses the sidebar popover).

type DbProfile = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  account_status: string;
  departments: { name: string } | null;
};

function fullName(p: DbProfile): string {
  const middle = p.middle_name ? `${p.middle_name[0]}.` : null;
  return [p.first_name, middle, p.last_name].filter(Boolean).join(" ");
}

function initials(p: DbProfile): string {
  const fromName = [p.first_name?.[0], p.last_name?.[0]].filter(Boolean).join("");
  return fromName || p.email[0].toUpperCase();
}

export async function ProfileView({
  role,
}: {
  role: "treasurer" | "adviser" | "admin";
}) {
  const user = await requireRole(role);
  const insforge = await createInsforgeServer();

  const { data } = await insforge.database
    .from("users")
    .select(
      "first_name, middle_name, last_name, email, role, account_status, departments(name)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!data) notFound();
  const profile = data as unknown as DbProfile;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Email", value: profile.email },
    // Admin has no department (department_id is null) — hide the row.
    ...(profile.departments ? [{ label: "Department", value: profile.departments.name }] : []),
    {
      label: "Account status",
      value: profile.account_status.replace(/_/g, " "),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-text-muted">Your account information.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-light text-lg font-semibold text-accent">
            {initials(profile)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-text-primary">
              {fullName(profile)}
            </p>
            <span className="mt-1 inline-block rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent capitalize">
              {profile.role}
            </span>
          </div>
        </div>

        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-t border-border px-5 py-4"
            >
              <dt className="text-sm text-text-muted">{row.label}</dt>
              <dd className="min-w-0 truncate text-sm font-medium text-text-primary capitalize">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Mobile logout — desktop keeps the sidebar popover. */}
      <div className="lg:hidden">
        <LogoutButton />
      </div>
    </div>
  );
}
