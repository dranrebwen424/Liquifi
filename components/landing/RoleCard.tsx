import type { ReactNode } from "react";

type Role = "Admin" | "Adviser" | "Treasurer";

type RoleCardProps = {
  role: Role;
  title: string;
  description: string;
  icon: ReactNode;
};

const ROLE_BADGE: Record<Role, string> = {
  Admin: "bg-role-admin-light text-role-admin",
  Adviser: "bg-role-adviser-light text-role-adviser",
  Treasurer: "bg-role-treasurer-light text-role-treasurer",
};

export function RoleCard({ role, title, description, icon }: RoleCardProps) {
  return (
    <div className="group bg-surface border border-border rounded-lg p-6 shadow-[0px_1px_2px_rgba(17,17,20,0.04),0px_1px_3px_rgba(17,17,20,0.06)] transition-colors hover:border-border-strong">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-secondary text-text-primary">
          {icon}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}
        >
          {role}
        </span>
      </div>
      <h3 className="mb-2 text-base font-semibold text-text-primary">{title}</h3>
      <p className="text-sm font-normal leading-5 text-text-secondary">
        {description}
      </p>
    </div>
  );
}
