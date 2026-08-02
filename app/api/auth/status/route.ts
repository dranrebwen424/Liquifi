import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const insforge = await createInsforgeServer();
    const { data: { user }, error } = await insforge.auth.getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ status: "unauthenticated" });
    }

    const { data: profile } = await insforge.database
      .from("users")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      status: profile?.account_status ?? "unknown",
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
