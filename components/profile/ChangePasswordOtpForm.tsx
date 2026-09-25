"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthOtpInput from "@/components/auth/AuthOtpInput";
import AuthButton from "@/components/auth/AuthButton";
import { PASSWORD_CHANGE_OTP_SENT_KEY } from "@/lib/password-change";

const RESEND_SECONDS = 60;

type Props = {
  email: string;
};

function getOtpSentAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(PASSWORD_CHANGE_OTP_SENT_KEY);
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setOtpSentAt(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PASSWORD_CHANGE_OTP_SENT_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; resend still works.
  }
}

export function ChangePasswordOtpForm({ email }: Props): ReactElement {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const sentAt = getOtpSentAt();
    if (!sentAt) return RESEND_SECONDS;
    return Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - sentAt) / 1000));
  });
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function handleVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitted(true);
    setApiError("");
    if (!code) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, intent: "change" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setApiError(data?.error || "Verification failed. Please try again.");
        return;
      }

      router.replace("/profile/change-password/new");
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(): Promise<void> {
    setSecondsLeft(RESEND_SECONDS);
    setApiError("");
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "change" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setApiError(data?.error || "Failed to resend code.");
        return;
      }
      setOtpSentAt();
    } catch {
      setApiError("Something went wrong.");
    }
  }

  return (
    <AuthShell top backHref="/profile/change-password">
      <div className="pt-4">
        <AuthCard
          title="Verify your email"
          subtitle={`We sent a 6-digit code to ${email}.`}
        >
          <form onSubmit={handleVerify} noValidate className="flex flex-col gap-6">
            <AuthOtpInput
              value={code}
              onChange={(value) => {
                setCode(value);
                if (apiError) setApiError("");
              }}
              error={submitted && !code}
            />
            {apiError && (
              <p role="alert" className="text-center text-sm text-error-dark">
                {apiError}
              </p>
            )}
            <AuthButton type="submit" loading={loading}>
              Verify
            </AuthButton>
            <button
              type="button"
              onClick={handleResend}
              disabled={secondsLeft > 0}
              className={`text-center text-sm font-medium outline-none transition-colors ${
                secondsLeft > 0
                  ? "text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
                  : "text-accent hover:text-accent-hover"
              }`}
            >
              {secondsLeft > 0
                ? `Resend code in ${secondsLeft}s`
                : "Resend code"}
            </button>
          </form>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
