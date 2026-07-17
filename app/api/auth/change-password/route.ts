import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, newPassword } = body;

    if (!newPassword || !token) {
      return NextResponse.json(
        { success: false, error: "New password and reset token are required." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    const { error } = await insforge.auth.resetPassword({
      newPassword,
      otp: token,
    });

    if (error) {
      console.error("[auth/change-password] resetPassword failed:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to reset password. The link may have expired.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/change-password]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
