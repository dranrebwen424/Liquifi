import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default function AdminProfilePage() {
  return (
    <>
      <Link
        href="/admin/departments"
        className="mt-6 flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary md:hidden"
        aria-label="Back to departments"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Profile
      </Link>
      <ProfileView role="admin" />
    </>
  );
}