import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  SIGNUP_IP_LIMIT,
  checkRateLimit,
  clearRateLimit,
  recordFailure,
} from "@/lib/rate-limit";

const EMAIL_EXISTS_MSG = "Email already exists. Try signing in instead.";
const JUST_STARTED_MSG =
  "A signup with this email just started. Check your inbox for the code, or try again in a few minutes.";
const MIN_PASSWORD_LENGTH = 8;

function formatWait(retryAfterSec: number): string {
  if (retryAfterSec < 90) return `${retryAfterSec} seconds`;
  const mins = Math.ceil(retryAfterSec / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

/**
 * Final step of the signup wizard: resolves/auto-seeds the department AND —
 * since the account is created here — sends the OTP email, right before the
 * client redirects to /otp. This is the single place the auth account is born,
 * so it also re-checks duplicate-email and weak-password (the same gates step 2
 * runs) to guard the race window between the two steps.
 *
 * The users ROW is not created until after OTP verification, in
 * POST /api/auth/create-profile. Approver notifications happen in create-profile
 * (after that row + its department_id exist), NOT here — the department-scoped
 * adviser lookup would return nothing before the row exists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, firstName, middleName, lastName, role, departmentCode, password } = body;

    if (!email || !role || !departmentCode || !firstName || !lastName || !password) {
      return NextResponse.json(
        { success: false, error: "Email, name, password, role, and department are required." },
        { status: 400 },
      );
    }
    if (!["treasurer", "adviser"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role." },
        { status: 400 },
      );
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 },
      );
    }

    // Rate limit guards the OTP email send (moved here from /auth/signup).
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      null;
    const ipKey = ip ? `sip:${ip}` : null;
    const ipLock = ipKey ? checkRateLimit(ipKey) : null;
    if (ipLock?.blocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many signup attempts. Try again in ${formatWait(ipLock.retryAfterSec)}.`,
        },
        { status: 429, headers: { "Retry-After": String(ipLock.retryAfterSec) } },
      );
    }
    if (ipKey) recordFailure(ipKey, SIGNUP_IP_LIMIT);

    const insforge = await createInsforgeServer();
    const normalizedEmail = String(email).trim();

    // Re-check duplicate before creating (guards the step-2 → step-3 race).
    let state: string | null = null;
    try {
      const { data } = await insforge.database.rpc("check_signup_email", {
        p_email: normalizedEmail,
      });
      state = typeof data === "string" ? data : null;
    } catch (rpcErr) {
      console.error("[auth/signup/complete] check_signup_email unavailable:", rpcErr);
    }

    if (state === "registered") {
      return NextResponse.json(
        { success: false, error: EMAIL_EXISTS_MSG },
        { status: 409 },
      );
    }

    if (state === "in_progress") {
      // Abandoned ghost — free it so this attempt's credentials win outright.
      try {
        await insforge.database.rpc("purge_signup_ghost", {
          p_email: normalizedEmail,
          p_min_age: "10 minutes",
        });
      } catch (rpcErr) {
        console.error("[auth/signup/complete] purge_signup_ghost unavailable:", rpcErr);
      }
    }

    // Create the auth account now — this is what emails the OTP code.
    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const { error: signupError } = await insforge.auth.signUp({
      email: normalizedEmail,
      password: String(password),
      name,
    });

    if (signupError) {
      console.error("[auth/signup/complete] InsForge signup failed:", signupError);
      const msg = signupError.message || "";
      const isDuplicate = /exist|duplicate|already/i.test(msg);
      return NextResponse.json(
        {
          success: false,
          error: isDuplicate
            ? JUST_STARTED_MSG
            : msg || "Signup failed. Please try again.",
        },
        { status: isDuplicate ? 409 : 400 },
      );
    }

    // Account born — this IP's prior probes are forgiven.
    if (ipKey) clearRateLimit(ipKey);

    // Resolve department code to ID — auto-create if missing
    let { data: dept, error: deptErr } = await insforge.database
      .from("departments")
      .select("id")
      .eq("code", departmentCode)
      .maybeSingle();

    if (deptErr) {
      console.error("[auth/signup/complete] dept lookup failed:", deptErr);
      return NextResponse.json(
        { success: false, error: "Department configuration error." },
        { status: 500 },
      );
    }

    if (!dept) {
      // ponytail: auto-seed department on first signup — admin management in Phase 2 replaces this.
      const deptId = crypto.randomUUID();
      const { error: createErr } = await insforge.database
        .from("departments")
        .insert({ id: deptId, name: departmentCode, code: departmentCode, is_active: true });
      if (createErr) {
        console.error("[auth/signup/complete] dept create failed:", createErr);
        return NextResponse.json(
          { success: false, error: "Department setup failed. Contact an admin." },
          { status: 500 },
        );
      }
      dept = { id: deptId };
    }

    // Notification / dept persistence intentionally absent here: the users row
    // (and its department_id) don't exist until create-profile runs post-OTP.
    // Notifications are sent from create-profile. See the doc comment above.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/signup/complete]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
