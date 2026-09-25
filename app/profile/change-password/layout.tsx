import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guard";
import { PasswordChangeProvider } from "@/components/profile/PasswordChangeProvider";

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.accountStatus !== "active") redirect("/login");

  return <PasswordChangeProvider>{children}</PasswordChangeProvider>;
}
