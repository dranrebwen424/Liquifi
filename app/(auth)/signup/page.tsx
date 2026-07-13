"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

// ponytail: mock department list — replaced by InsForge `departments` query later.
const DEPARTMENTS = [
  { code: "CCS", name: "Computer Studies" },
  { code: "COE", name: "Engineering" },
  { code: "CAS", name: "Arts & Sciences" },
  { code: "CBA", name: "Business & Accountancy" },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    role: "treasurer",
    department: DEPARTMENTS[0].code,
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ponytail: mock — real flow writes the users row (account_status = pending_approval)
  // then routes to OTP verification per the AGENTS.md signup flow.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/otp");
  }

  const valid = form.firstName && form.lastName && form.email && form.password;

  return (
    <AuthShell subtitle="Request an account for your council.">
      <AuthCard title="Create your account" subtitle="Advisers and treasurers sign up here.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <AuthInput id="firstName" label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} required />
            <AuthInput id="lastName" label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} required />
          </div>
          <AuthInput id="middleName" label="Middle name (optional)" value={form.middleName} onChange={(v) => set("middleName", v)} />
          <AuthInput id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@mabini.edu.ph" required />
          <AuthInput id="password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={(v) => set("password", v)} placeholder="At least 8 characters" required />

          <div className="flex flex-col gap-3">
            <label htmlFor="role" className="text-sm font-medium text-text-secondary">Role</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="treasurer">Treasurer</option>
              <option value="adviser">Adviser</option>
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="department" className="text-sm font-medium text-text-secondary">Department</label>
            <select
              id="department"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <AuthButton type="submit" disabled={!valid}>Create account</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Already have an account? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
