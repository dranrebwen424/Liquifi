import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guard";

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "active") redirect("/login");

  return children;
}
