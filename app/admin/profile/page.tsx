import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default function AdminProfilePage() {
  return <ProfileView role="admin" />;
}
