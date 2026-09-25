import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current password and new password are required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters." },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "Choose a new password different from your current password." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    const cookieStore = await cookies();
    const token = cookieStore.get("insforge_access_token")?.value;
    const payload = token
      ? (JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf-8")) as { email?: string })
      : null;
    const email = payload?.email ?? null;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "You must be signed in to change your password." },
        { status: 401 },
      );
    }

    // Verify the current password by attempting a sign-in with it.
    const { error: verifyError } = await insforge.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      console.error("[auth/change-password/verify] signInWithPassword failed:", verifyError);
      return NextResponse.json(
        { success: false, error: verifyError.message || "Current password is incorrect." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("[auth/change-password/verify]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}