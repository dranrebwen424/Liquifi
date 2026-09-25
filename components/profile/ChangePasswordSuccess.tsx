"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthButton from "@/components/auth/AuthButton";
import LottiePlayer from "@/components/LottiePlayer";

const REDIRECT_SECONDS = 10;

type Props = {
  homeHref: string;
};

export default function ChangePasswordSuccess({ homeHref }: Props): ReactElement {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace(homeHref);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [homeHref, router, secondsLeft]);

  return (
    <AuthShell subtitle="Your password has been changed." backHref={homeHref}>
      <AuthCard title="Password changed" center>
        <div className="flex flex-col items-center gap-6">
          <LottiePlayer
            src="/Auth%20pages/success.json"
            className="h-48 w-48"
            loop={false}
          />
          <p role="status" className="text-sm text-text-secondary">
            Your password has been updated successfully.
          </p>
          <p aria-live="polite" className="text-sm text-text-muted">
            Redirecting to home in {secondsLeft} seconds.
          </p>
          <AuthButton type="button" onClick={() => router.replace(homeHref)}>
            Return to Home
          </AuthButton>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
