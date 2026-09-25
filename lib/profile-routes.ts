import type { Role } from "@/types";

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/departments",
  adviser: "/adviser/home",
  treasurer: "/treasurer/home",
};

export const ROLE_PROFILE: Record<Role, string> = {
  admin: "/admin/profile",
  adviser: "/adviser/profile",
  treasurer: "/treasurer/profile",
};
