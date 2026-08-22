import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

/**
 * Creates the InsForge auth user (step 2 of the signup wizard).
 * Running it here means InsForge's own duplicate-email and weak-password
 * errors surface on the step where those fields live.
 *
 * Council role/department are completed on the wizard's last step via
 * POST /api/auth/signup/complete, which also notifies approvers. The users-table
 * row itself is deferred to POST /api/auth/create-profile after OTP verification.
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

    const insforge = await createInsforgeServer();

    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const { error: signupError } = await insforge.auth.signUp({
      email,
      password,
      name,
    });

    if (signupError) {
      console.error("[auth/signup] InsForge signup failed:", signupError);
      return NextResponse.json(
        { success: false, error: signupError.message || "Signup failed. Please try again." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
