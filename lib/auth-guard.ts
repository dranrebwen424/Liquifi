import { createInsforgeServer } from "@/lib/insforge-server";
import type { AuthUser, GuardContext, PreconditionCheck, Role } from "@/types";

export class AuthError extends Error {
  status: number;
  code: "unauthenticated" | "forbidden_role" | "forbidden_department";
  constructor(
    code: AuthError["code"],
    message: string,
    status = code === "unauthenticated" ? 401 : 403,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

async function getCurrentUser(): Promise<AuthUser | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await insforge.database
    .from("users")
    .select("role, department_id, account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    role: profile.role,
    departmentId: profile.department_id,
    accountStatus: profile.account_status,
  };
}

export async function requireRole(
  requiredRole: "public",
  departmentId?: string,
  preconditionCheck?: PreconditionCheck,
): Promise<AuthUser | null>;
export async function requireRole(
  requiredRole: Exclude<Role, "public"> | Exclude<Role, "public">[],
  departmentId?: string,
  preconditionCheck?: PreconditionCheck,
): Promise<AuthUser>;
export async function requireRole(
  requiredRole: Role | Role[],
  departmentId?: string,
  preconditionCheck?: PreconditionCheck,
): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes("public")) {
    if (!user) {
      throw new AuthError("unauthenticated", "Authentication required");
    }
    if (!roles.includes(user.role)) {
      throw new AuthError(
        "forbidden_role",
        `Requires role: ${roles.join(" or ")}`,
      );
    }
    // Admin is unrestricted across departments; advisers/treasurers are scoped.
    if (
      user.role !== "admin" &&
      departmentId &&
      user.departmentId !== departmentId
    ) {
      throw new AuthError(
        "forbidden_department",
        "Resource does not belong to your department",
      );
    }
  }

  if (preconditionCheck) {
    const ctx: GuardContext = { user, departmentId };
    await preconditionCheck(ctx);
  }

  return user;
}
