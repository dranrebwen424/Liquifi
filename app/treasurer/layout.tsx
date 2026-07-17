import { requireLayoutRole } from "@/lib/layout-guard";

export default async function TreasurerLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole("treasurer");
  return <>{children}</>;
}
