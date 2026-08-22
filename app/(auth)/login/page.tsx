"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";
import LottiePlayer from "@/components/LottiePlayer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [softLocked, setSoftLocked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSoftLocked(Boolean(data.softLocked));
        setApiError(data.error || "Invalid email or password.");
        return;
      }
      router.push(data.redirectTo);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell hideLogo top>
      <div className="pt-4 sm:pt-0">
        <LottiePlayer
          src="/Auth%20pages/Employee-content.json"
          className="mx-auto mb-0 h-48 w-48 sm:h-82 sm:w-82"
        />
        <AuthCard title="WELCOME" center>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <AuthInput
            id="email"
            type="email"
            label="Email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
            error={submitted && !email}
          />
          <AuthInput
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            required
            error={submitted && !password}
          />
          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}
          <AuthButton type="submit" loading={loading}>
            Sign in
          </AuthButton>
          <div className="flex justify-center">
            <AuthLink href="/forgot-password" muted>
              Forget Password?
            </AuthLink>
          </div>
          <AuthButton variant="outline" type="button" onClick={() => router.push("/signup")}>
            Create an account
          </AuthButton>
        </form>
        </AuthCard>
      </div>
      {softLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-alpha px-4"
          onClick={() => setSoftLocked(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="soft-lock-title"
          >
            <h2 id="soft-lock-title" className="text-lg font-semibold text-text-primary">
              Account temporarily locked
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Too many failed sign-in attempts. For your security, we recommend resetting your
              password — it unlocks your account immediately.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <AuthButton type="button" onClick={() => router.push("/forgot-password")}>
                Reset Password
              </AuthButton>
              <AuthButton variant="outline" type="button" onClick={() => setSoftLocked(false)}>
                Try again later
              </AuthButton>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
