import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  SIGNUP_IP_LIMIT,
  checkRateLimit,
  recordFailure,
} from "@/lib/rate-limit";

const EMAIL_EXISTS_MSG = "Email already exists. Try signing in instead.";

function formatWait(retryAfterSec: number): string {
  if (retryAfterSec < 90) return `${retryAfterSec} seconds`;
  const mins = Math.ceil(retryAfterSec / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

/**
 * Step 2 of the signup wizard — a validation-only gate. It does NOT create
 * the auth account or send the OTP email (that happens after the last wizard
 * step, in /api/auth/signup/complete, right before the /otp redirect).
 *
 * Classifies the email via check_signup_email():
 *   'registered'  → 409 "Email already exists" right here on the email step.
 *   'in_progress' → a ghost from an abandoned attempt; left in place here,
 *                   purged in complete when the account is actually created.
 *   'none'        → available; proceed to the next step.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, middleName, lastName, email, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { success: false, error: "All required fields must be filled." },
        { status: 400 },
      );
    }

    // Attempt bucket: every classified request costs a tick, successful
    // creations refund the whole bucket. Skipped when no IP header exists
    // (same policy as the login limiter).
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

    const normalizedEmail = String(email).trim();
    const insforge = await createInsforgeServer();

    // Classify before creating anything. If the SQL functions aren't deployed
    // yet this degrades to null and the raw signUp below keeps old behavior.
    let state: string | null = null;
    try {
      const { data } = await insforge.database.rpc("check_signup_email", {
        p_email: normalizedEmail,
      });
      state = typeof data === "string" ? data : null;
    } catch (rpcErr) {
      console.error("[auth/signup] check_signup_email unavailable:", rpcErr);
    }

    if (state === "registered") {
      return NextResponse.json(
        { success: false, error: EMAIL_EXISTS_MSG },
        { status: 409 },
      );
    }

    // Validation-only gate: this step does NOT create the auth account or send
    // the OTP email. Creation (and the OTP email) happens in
    // /api/auth/signup/complete — the last wizard step, right before the user
    // lands on the /otp page. Early duplicate feedback still surfaces here.
    // 'in_progress' ghosts are left in place; complete purges them when it creates.
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
