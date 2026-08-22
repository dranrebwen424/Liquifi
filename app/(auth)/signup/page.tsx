"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthSelect from "@/components/auth/AuthSelect";
import AuthButton from "@/components/auth/AuthButton";
import AuthLink from "@/components/auth/AuthLink";

const FALLBACK_DEPARTMENTS = [
  { code: "CCS", name: "Computer Studies" },
  { code: "COE", name: "Engineering" },
  { code: "CAS", name: "Arts & Sciences" },
  { code: "CBA", name: "Business & Accountancy" },
];

/** Fields required to advance past each step; the final submit re-checks everything. */
const STEP_REQUIRED: Record<number, Array<keyof SignupForm>> = {
  1: ["firstName", "lastName"],
  2: ["email", "password"],
  3: [],
};

type SignupForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  department: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SignupForm>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    role: "treasurer",
    department: "",
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.departments.length > 0) {
          setDepartments(data.departments);
          setForm((prev) => ({ ...prev, department: data.departments[0].code }));
        }
      })
      .catch(() => {
        // ponytail: fallback to hardcoded list on network error
      });
  }, []);
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

    // Gate on the current step's fields first — later steps stay unvalidated.
    const required = STEP_REQUIRED[step];
    if (required.some((k) => !form[k])) return;

    if (step < 3) {
      setStep(step + 1);
      setSubmitted(false); // fresh step, no stale red borders
      return;
    }

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

  function goBack() {
    setStep(step - 1);
    setSubmitted(false); // fresh step, no stale red borders
  }

  return (
    <AuthShell top backHref="/login">
      <div className="pt-4">
        <AuthCard title="Get Started" subtitle="Request an account for your council.">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <AuthInput id="firstName" label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} required error={submitted && !form.firstName} />
                <AuthInput id="lastName" label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} required error={submitted && !form.lastName} />
              </div>
              <AuthInput id="middleName" label="Middle name (optional)" value={form.middleName} onChange={(v) => set("middleName", v)} />
            </>
          )}

          {step === 2 && (
            <>
              <AuthInput id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(v) => set("email", v)} required error={submitted && !form.email} />
              <AuthInput id="password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={(v) => set("password", v)} required error={submitted && !form.password} />
            </>
          )}

          {step === 3 && (
            <>
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
                options={departments.map((d) => ({ value: d.code, label: `${d.name} (${d.code})` }))}
              />
            </>
          )}

          {apiError && (
            <p className="text-sm text-red-500 text-center">{apiError}</p>
          )}
          <div className={step === 1 ? "" : "flex gap-3"}>
            {step > 1 && (
              <AuthButton variant="outline" type="button" onClick={goBack}>
                Back
              </AuthButton>
            )}
            <AuthButton type="submit" loading={loading}>Continue</AuthButton>
          </div>
          <p className="text-center text-sm font-normal text-text-secondary">
            Already have an account? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
