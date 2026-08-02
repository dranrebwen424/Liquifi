import { requireLayoutRole } from "@/lib/layout-guard";
import { TreasurerSidebar } from "@/components/treasurer/TreasurerSidebar";
import { TreasurerMobileBottomNav } from "@/components/treasurer/TreasurerMobileBottomNav";
import { MobileTopBar } from "@/components/treasurer/MobileTopBar";

export default async function TreasurerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireLayoutRole("treasurer");

  return (
    <div className="min-h-screen bg-background">
      <TreasurerSidebar />

      <MobileTopBar />

      {/* Mobile bottom nav */}
      <TreasurerMobileBottomNav />

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1440px] px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
