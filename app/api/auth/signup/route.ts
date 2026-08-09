import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, middleName, lastName, email, password, role, departmentCode } = body;

    if (!firstName || !lastName || !email || !password || !role || !departmentCode) {
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

    // 1a. Resolve department code to ID — auto-create if missing
    let { data: dept, error: deptErr } = await insforge.database
      .from("departments")
      .select("id")
      .eq("code", departmentCode)
      .maybeSingle();

    if (deptErr) {
      console.error("[auth/signup] dept lookup failed:", deptErr);
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
        console.error("[auth/signup] dept create failed:", createErr);
        return NextResponse.json(
          { success: false, error: "Department setup failed. Contact an admin." },
          { status: 500 },
        );
      }
      dept = { id: deptId };
    }

    const departmentId = dept.id;

    // 1b. Create the InsForge auth user
    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const { data: signupData, error: signupError } = await insforge.auth.signUp({
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

    // Note: The InsForge API may not return user.id in the signUp response,
    // but the auth user is still created and OTP email sent. The users table
    // row is deferred to POST /api/auth/create-profile after OTP verification.

    // 3. Create notification for the appropriate approver
    // ponytail: notification insert failures are non-fatal — the approval UI can surface pending users from the users table directly.
    try {
      if (role === "adviser") {
        // Notify all admins
        const { data: admins } = await insforge.database
          .from("users")
          .select("id")
          .eq("role", "admin")
          .eq("account_status", "active");

        if (admins && admins.length > 0) {
          await createNotification(
            admins.map((a: { id: string }) => a.id),
            "adviser_signup_pending",
            {
              applicant_email: email,
              applicant_name: name,
              department_id: departmentId,
            },
          );
        }
      } else {
        // Notify the department's active adviser
        const { data: adviser } = await insforge.database
          .from("users")
          .select("id")
          .eq("department_id", departmentId)
          .eq("role", "adviser")
          .eq("account_status", "active")
          .maybeSingle();

        if (adviser) {
          await createNotification(adviser.id, "treasurer_signup_pending", {
            applicant_email: email,
            applicant_name: name,
            department_id: departmentId,
          });
        }
      }
    } catch (notifErr) {
      console.error("[auth/signup] notification insert error:", notifErr);
      // Non-fatal — continue
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
