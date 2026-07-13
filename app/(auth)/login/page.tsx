"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ponytail: mock — real flow calls InsForge auth, then routes to the role home.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/");
  }

  return (
    <AuthShell subtitle="Sign in to manage your council's liquidation.">
      <AuthCard title="Sign in" subtitle="Welcome back.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <AuthInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="you@mabini.edu.ph"
            required
          />
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />
          <div className="flex items-center justify-end">
            <AuthLink href="/forgot-password">Forgot password?</AuthLink>
          </div>
          <AuthButton type="submit" disabled={!email || !password}>
            Sign in
          </AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            No account? <AuthLink href="/signup">Create one</AuthLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
