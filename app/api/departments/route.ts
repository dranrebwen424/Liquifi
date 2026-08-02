import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function GET() {
  try {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.database
      .from("departments")
      .select("code, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[api/departments] fetch failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch departments." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, departments: data ?? [] });
  } catch (err) {
    console.error("[api/departments]", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
