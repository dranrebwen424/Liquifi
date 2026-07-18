"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthSelect from "@/components/auth/AuthSelect";
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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (apiError) setApiError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");
    const valid = form.firstName && form.lastName && form.email && form.password;
    if (!valid) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: form.role,
          departmentCode: form.department,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setApiError(data.error || "Signup failed. Please try again.");
        return;
      }
      // Store signup data so the OTP page can create the users row after verification
      sessionStorage.setItem("pending_signup", JSON.stringify({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        departmentCode: form.department,
      }));
      router.push(`/otp?email=${encodeURIComponent(form.email)}&intent=signup`);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Request an account for your council." backHref="/login">
      <AuthCard title="Get Started" subtitle="Advisers and treasurers sign up here.">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <AuthInput id="firstName" label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} required error={submitted && !form.firstName} />
            <AuthInput id="lastName" label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} required error={submitted && !form.lastName} />
          </div>
          <AuthInput id="middleName" label="Middle name (optional)" value={form.middleName} onChange={(v) => set("middleName", v)} />
          <AuthInput id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(v) => set("email", v)} required error={submitted && !form.email} />
          <AuthInput id="password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={(v) => set("password", v)} required error={submitted && !form.password} />

          <AuthSelect
            id="role"
            label="Role"
            value={form.role}
            onChange={(v) => set("role", v)}
            options={[
              { value: "treasurer", label: "Treasurer" },
              { value: "adviser", label: "Adviser" },
            ]}
          />

          <AuthSelect
            id="department"
            label="Department"
            value={form.department}
            onChange={(v) => set("department", v)}
            options={DEPARTMENTS.map((d) => ({ value: d.code, label: `${d.name} (${d.code})` }))}
          />

          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}
          <AuthButton type="submit" loading={loading}>Create account</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Already have an account? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
