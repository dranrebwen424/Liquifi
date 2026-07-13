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

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // ponytail: mock — real flow verifies the OTP via InsForge, then routes to /pending-approval.
  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    router.push("/pending-approval");
  }

  return (
    <AuthShell subtitle="Enter the code we sent to your email.">
      <AuthCard title="Verify your email" subtitle="Check your inbox for a 6-digit code.">
        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <AuthInput
            id="otp"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            required
          />
          <AuthButton type="submit" disabled={code.length !== 6}>Verify</AuthButton>
          <button
            type="button"
            onClick={() => setSecondsLeft(RESEND_SECONDS)}
            disabled={secondsLeft > 0}
            className="text-center text-sm font-medium text-accent outline-none hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
