"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

const RESEND_SECONDS = 60;

export default function OtpPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // ponytail: mock — real flow verifies the OTP via InsForge, then routes to /pending-approval.
  // Validate on submit: empty code turns red instead of greying the button.
  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!code) return;
    router.push("/pending-approval");
  }

  return (
    <AuthShell subtitle="Enter the code we sent to your email.">
      <AuthCard title="Verify your email" subtitle="Check your inbox for a 6-digit code.">
        <form onSubmit={handleVerify} noValidate className="flex flex-col gap-6">
          <AuthInput
            id="otp"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            required
            error={submitted && !code}
          />
          <AuthButton type="submit">Verify</AuthButton>
          <button
            type="button"
            onClick={() => setSecondsLeft(RESEND_SECONDS)}
            disabled={secondsLeft > 0}
            className="text-center text-sm font-medium text-text-muted outline-none hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
