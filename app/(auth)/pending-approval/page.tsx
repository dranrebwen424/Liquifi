"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthButton from "@/components/auth/AuthButton";
import LottiePlayer from "@/components/LottiePlayer";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [rejected, setRejected] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (data.status === "active") {
          intervalRef.current && clearInterval(intervalRef.current);
          router.push("/login");
        } else if (data.status === "rejected") {
          intervalRef.current && clearInterval(intervalRef.current);
          setRejected(true);
        } else if (data.status === "unauthenticated") {
          intervalRef.current && clearInterval(intervalRef.current);
          setSessionLost(true);
        }
      } catch {
        // network error — keep polling
      }
    }

    checkStatus();
    intervalRef.current = setInterval(checkStatus, 10000);
    return () => { intervalRef.current && clearInterval(intervalRef.current); };
  }, [router]);

  return (
    <AuthShell>
      <div className="mt-24">
        <AuthCard
          title="Awaiting Approval"
          subtitle="You&rsquo;re all set! Your registration has been received and is awaiting approval. We&rsquo;ll email you as soon as your account is ready."
        >
          <div className="flex flex-col items-center">
            {rejected && (
              <div className="mb-6 w-full rounded-lg border border-error bg-error-lightest px-4 py-3 text-center text-sm text-error">
                Your registration request was not approved. Please contact your
                department for more information.
              </div>
            )}

            {sessionLost && (
              <div className="mb-6 w-full rounded-lg border border-warning bg-warning-lightest px-4 py-3 text-center text-sm text-warning">
                Your session has expired.{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-medium underline underline-offset-2 hover:no-underline"
                >
                  Sign in again
                </button>{" "}
                to continue.
              </div>
            )}

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
