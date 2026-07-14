"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthOtpInput from "@/components/auth/AuthOtpInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

const RESEND_SECONDS = 60;

function OtpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReset = searchParams.get("purpose") === "reset";
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // ponytail: mock — real flow verifies the OTP via InsForge.
  // purpose=reset → /change-password; signup → /pending-approval.
  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!code) return;
    if (isReset) {
      router.push(`/change-password?email=${encodeURIComponent(email)}`);
    } else {
      router.push("/pending-approval");
    }
  }

  return (
    <AuthShell
      subtitle={isReset ? "Reset your password." : "Enter the code we sent to your email."}
      backHref={isReset ? "/forgot-password" : "/signup"}
    >
      <AuthCard
        title="Verify your email"
        subtitle={
          isReset
            ? `We sent a 6-digit code to ${email || "your email"}.`
            : "Check your inbox for a 6-digit code."
        }
      >
        <form onSubmit={handleVerify} noValidate className="flex flex-col gap-6">
          <AuthOtpInput value={code} onChange={setCode} error={submitted && !code} />
          <AuthButton type="submit">Verify</AuthButton>
          <button
            type="button"
            onClick={() => setSecondsLeft(RESEND_SECONDS)}
            disabled={secondsLeft > 0}
            className={`text-center text-sm font-medium outline-none transition-colors ${
              secondsLeft > 0
                ? "text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
                : "text-accent hover:text-accent-hover"
            }`}
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
          <p className="text-center text-sm font-normal text-text-secondary">
            {isReset ? (
              <>
                Remembered it? <AuthLink href="/login">Sign in</AuthLink>
              </>
            ) : (
              <>
                Wrong email? <AuthLink href="/signup">Sign up</AuthLink>
              </>
            )}
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpPageInner />
    </Suspense>
  );
}
