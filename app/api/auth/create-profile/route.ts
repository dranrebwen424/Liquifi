import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, firstName, middleName, lastName, email, role, departmentCode } = body;

    if (!userId || !firstName || !lastName || !email || !role || !departmentCode) {
      return NextResponse.json(
        { success: false, error: "All required fields must be filled." },
        { status: 400 },
      );
    }
    if (!["treasurer", "adviser"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role." },
        { status: 400 },
      );
    }

    const insforge = await createInsforgeServer();

    // Resolve department code to ID
    const { data: dept, error: deptErr } = await insforge.database
      .from("departments")
      .select("id")
      .eq("code", departmentCode)
      .maybeSingle();

    if (deptErr || !dept) {
      return NextResponse.json(
        { success: false, error: "Department not found." },
        { status: 400 },
      );
    }

    // Create the users row via SECURITY DEFINER function (bypasses RLS)
    const { error: rpcErr } = await insforge.database.rpc("create_user_profile", {
      p_id: userId,
      p_first_name: firstName,
      p_middle_name: middleName || null,
      p_last_name: lastName,
      p_email: email,
      p_role: role,
      p_department_id: dept.id,
      p_account_status: "pending_approval",
      p_otp_verified_at: new Date().toISOString(),
    });

    if (rpcErr) {
      // If the row already exists (e.g. retry), just update otp_verified_at
      if ("code" in rpcErr && rpcErr.code === "23505") {
        const { error: updateErr } = await insforge.database
          .from("users")
          .update({ otp_verified_at: new Date().toISOString() })
          .eq("id", userId);

        if (updateErr) {
          console.error("[auth/create-profile] update existing failed:", updateErr);
          return NextResponse.json(
            { success: false, error: "Failed to finalize account." },
            { status: 500 },
          );
        }
      } else {
        console.error("[auth/create-profile] rpc failed:", rpcErr);
        return NextResponse.json(
          { success: false, error: "Failed to create profile." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/create-profile]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
