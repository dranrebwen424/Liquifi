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

  // ponytail: mock — real flow calls InsForge auth, then routes to the role home.
  // Validate on submit: empty required fields turn red instead of greying the button.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!email || !password) return;
    router.push("/");
  }

  return (
    <AuthShell hideLogo top>
      <div>
        <LottiePlayer
          src="/Auth%20pages/Employee-content.json"
          className="mx-auto mb-0 h-82 w-82"
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
          <AuthButton type="submit">
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
    </AuthShell>
  );
}
