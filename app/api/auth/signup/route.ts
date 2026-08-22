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

function formatWait(retryAfterSec: number): string {
  if (retryAfterSec < 90) return `${retryAfterSec} seconds`;
  const mins = Math.ceil(retryAfterSec / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

/**
 * Creates the InsForge auth user (step 2 of the signup wizard).
 *
 * Before touching InsForge the route classifies the email via
 * check_signup_email():
 *   'none'        → create fresh (signUp binds name+password+OTP email)
 *   'in_progress' → unverified ghost from an abandoned attempt: purge it
 *                   (time-boxed to 10 min so live sessions can't be hijacked)
 *                   and let the fresh signUp below win with the NEW password.
 *   'registered'  → 409 "Email already exists" right here on the email step.
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

    if (state === "in_progress") {
      // Abandoned ghost — free it so this attempt's credentials win outright.
      // Recent ghosts (<10 min) survive the purge; their collision surfaces
      // below as the friendly "just started" message instead of raw jargon.
      try {
        await insforge.database.rpc("purge_signup_ghost", {
          p_email: normalizedEmail,
          p_min_age: "10 minutes",
        });
      } catch (rpcErr) {
        console.error("[auth/signup] purge_signup_ghost unavailable:", rpcErr);
      }
    }

    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const { error: signupError } = await insforge.auth.signUp({
      email: normalizedEmail,
      password,
      name,
    });

    if (signupError) {
      console.error("[auth/signup] InsForge signup failed:", signupError);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
