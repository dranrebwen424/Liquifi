"use client";

import { useState, useEffect, useRef } from "react";
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

/** ponytail: stricter than InsForge's own minimum — a client gate can only over-block, never let one slip to the last page. */
const MIN_PASSWORD_LENGTH = 8;

/** ponytail: pragmatic format guard — catches "not an email" before the last step without over-engineering a full RFC validator. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ponytail: resend cooldown mirrors the /otp page's 60s timer, persisted per email so back-nav never resends. */
const RESEND_COOLDOWN_MS = 60_000;
/** sessionStorage: the wizard draft (step + form) so back-from-/otp restores step 3 with fields intact. */
const DRAFT_KEY = "signup_draft";
/** sessionStorage: per-email "OTP last sent at" epoch ms — powers the persistent resend cooldown. */
const OTP_SENT_KEY = "signup_otp_sent";

function loadDraft(): { step: number; form: Partial<SignupForm> } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(step: number, form: SignupForm) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form }));
  } catch {
    // ponytail: non-fatal — draft is a nicety
  }
}

function getOtpSentAt(email: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const map = JSON.parse(sessionStorage.getItem(OTP_SENT_KEY) || "{}");
    return typeof map[email] === "number" ? map[email] : null;
  } catch {
    return null;
  }
}

function setOtpSentAt(email: string, ms: number) {
  if (typeof window === "undefined") return;
  try {
    const map = JSON.parse(sessionStorage.getItem(OTP_SENT_KEY) || "{}");
    map[email] = ms;
    sessionStorage.setItem(OTP_SENT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

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

  // Indicates the saved draft (if any) has been applied; persistence is disabled until then
  // so a fresh mount never clobbers a returning user's saved step with step 1.
  const hydrated = useRef(false);

  // Restore the saved wizard draft on mount (covers back-from-/otp and mid-wizard navigation).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setStep(draft.step);
      setForm((prev) => ({ ...prev, ...draft.form }));
    }
    hydrated.current = true;
  }, []);

  // Persist step + form whenever they change, once hydration is done.
  useEffect(() => {
    if (!hydrated.current) return;
    saveDraft(step, form);
  }, [step, form]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.departments.length > 0) {
          setDepartments(data.departments);
          // Only set a default department if none was restored from the draft.
          setForm((prev) => (prev.department ? prev : { ...prev, department: data.departments[0].code }));
        }
      })
      .catch(() => {
        // ponytail: fallback to hardcoded list on network error
      });
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [stepError, setStepError] = useState("");

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (apiError) setApiError("");
    if (stepError) setStepError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");

    // Gate on the current step's fields first — later steps stay unvalidated.
    const required = STEP_REQUIRED[step];
    if (required.some((k) => !form[k])) return;

    if (step === 1) {
      setStep(2);
      setSubmitted(false); // fresh step, no stale red borders
      return;
    }

    setLoading(true);
    try {
      if (step === 2) {
        // Flag problems HERE — the email/password page — never on the last page.
        if (form.password.length < MIN_PASSWORD_LENGTH) {
          setStepError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
          return;
        }
        if (!EMAIL_RE.test(form.email.trim())) {
          setStepError("Please enter a valid email address.");
          return;
        }
        // Validates the email (duplicate check) — the auth account and OTP
        // email are created later, on step 3, right before the /otp redirect.
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            email: form.email.trim(),
            password: form.password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setStepError(data.error || "Signup failed. Please try again.");
          return;
        }
        setStep(3);
        setSubmitted(false);
        return;
      }

      // Step 3 — council selection; creates the account and sends the OTP
      // email here (not on step 2), right before redirecting to /otp.
      const normalEmail = form.email.trim();
      const sentAt = getOtpSentAt(normalEmail);
      const withinCooldown = sentAt !== null && Date.now() - sentAt < RESEND_COOLDOWN_MS;

      // Same email already got its OTP within cooldown (e.g. user backed from /otp and
      // proceeded again) — don't resend, just refresh the pending payload and return to /otp.
      if (withinCooldown) {
        sessionStorage.setItem("pending_signup", JSON.stringify({
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          email: normalEmail,
          role: form.role,
          departmentCode: form.department,
        }));
        router.push(`/otp?email=${encodeURIComponent(normalEmail)}&intent=signup`);
        return;
      }

      const res = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          role: form.role,
          departmentCode: form.department,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // InsForge rejects a 2nd signUp for an email that's still in_progress (ghost not
        // purged, ~10 min). That's the graceful back-from-/otp case: the OTP from the
        // earlier send is still valid (ghost purges before the 15-min OTP expiry), so we
        // return to /otp instead of blocking. Distinct from the truly-registered case
        // ("Email already exists"), which must keep blocking. Don't touch otpSentAt here —
        // no new send happened, so /otp keeps showing the real remaining cooldown.
        if (data.error && data.error.includes("just started")) {
          sessionStorage.setItem("pending_signup", JSON.stringify({
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            email: normalEmail,
            role: form.role,
            departmentCode: form.department,
          }));
          router.push(`/otp?email=${encodeURIComponent(normalEmail)}&intent=signup`);
          return;
        }
        setApiError(data.error || "Signup failed. Please try again.");
        return;
      }
      // Remember this email's OTP send time so backing + re-proceeding doesn't resend,
      // and /otp can show the remaining cooldown accurately.
      setOtpSentAt(normalEmail, Date.now());
      // Store signup data so the OTP page can create the users row after verification
      sessionStorage.setItem("pending_signup", JSON.stringify({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        email: normalEmail,
        role: form.role,
        departmentCode: form.department,
      }));
      router.push(`/otp?email=${encodeURIComponent(normalEmail)}&intent=signup`);
    } catch {
      if (step === 2) setStepError("Something went wrong. Please try again.");
      else setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Back within the wizard: step 2 -> 1, step 3 -> 2. No back button on step 1.
  const back =
    step === 2 ? () => setStep(1) : step === 3 ? () => setStep(2) : undefined;

  return (
    <AuthShell top onBack={back}>
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

          {(apiError || stepError) && (
            <p className="text-sm text-red-500 text-center">{apiError || stepError}</p>
          )}
          <AuthButton type="submit" loading={loading}>Continue</AuthButton>
          <p className="text-center text-sm font-normal text-text-secondary">
            Already have an account? <AuthLink href="/login">Sign in</AuthLink>
          </p>
        </form>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
