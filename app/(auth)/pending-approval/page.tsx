"use client";

import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthButton from "@/components/auth/AuthButton";
import LottiePlayer from "@/components/LottiePlayer";

export default function PendingApprovalPage() {
  const router = useRouter();

  return (
    <AuthShell>
      <div className="mt-24">
        <AuthCard
          title="Awaiting Approval"
          subtitle="You&rsquo;re all set! Your registration has been received and is awaiting approval. We&rsquo;ll email you as soon as your account is ready."
        >
          <div className="flex flex-col items-center">
            <LottiePlayer
              src="/Auth%20pages/loading-time.json"
              className="mt-24 h-48 w-48"
            />

            <AuthButton
              variant="primary"
              onClick={() => router.push("/login")}
              className="mt-24"
            >
              Back to login
            </AuthButton>
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
