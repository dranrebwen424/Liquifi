import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guard";
import type { Role } from "@/types";

/**
 * Server-side guard for route group layouts.
 * Redirects unauthenticated or wrong-role users to login / landing.
 * Returns the AuthUser on success so the layout can pass it to children.
 */
export async function requireLayoutRole(requiredRole: Role) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login");
  }

  if (!user || user.accountStatus !== "active") redirect("/login");
  if (user.role !== requiredRole) redirect("/login");

  return { id: user.id, email: user.email ?? "", role: user.role };
}
