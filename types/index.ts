export type Role = "admin" | "adviser" | "treasurer" | "public";

export type AccountStatus =
  | "pending_approval"
  | "active"
  | "deactivated"
  | "rejected";

export type AuthUser = {
  id: string;
  email: string;
  role: Exclude<Role, "public">;
  departmentId: string | null;
  accountStatus: AccountStatus;
};

export type GuardContext = {
  user: AuthUser | null;
  departmentId?: string;
};

export type PreconditionCheck = (ctx: GuardContext) => Promise<void> | void;
