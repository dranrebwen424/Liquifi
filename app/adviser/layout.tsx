import { requireLayoutRole } from "@/lib/layout-guard";

export default async function AdviserLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole("adviser");
  return <>{children}</>;
}
