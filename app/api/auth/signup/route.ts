import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

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

    const authUserId = signupData?.user?.id;
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: "Account creation failed. Please try again." },
        { status: 500 },
      );
    }

    // 2. Write the users table row with profile, role, department
    const { error: userInsertError } = await insforge.database
      .from("users")
      .insert({
        id: authUserId,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        email,
        role,
        department_id: departmentId,
        account_status: "pending_approval",
      });

    if (userInsertError) {
      console.error("[auth/signup] users insert failed:", userInsertError);
      // Clean up the auth user on failure
      // ponytail: no SDK method to delete auth user — row will sit orphaned if insert fails.
      // The signup flow will fail, user retries. Acceptable for now.
      return NextResponse.json(
        { success: false, error: "Account setup failed. Please try again." },
        { status: 500 },
      );
    }

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
          await insforge.database
            .from("notifications")
            .insert(
              admins.map((a: { id: string }) => ({
                user_id: a.id,
                type: "adviser_signup_pending",
                payload_json: {
                  applicant_id: authUserId,
                  applicant_name: name,
                  department_id: departmentId,
                },
                read: false,
              })),
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
          await insforge.database.from("notifications").insert({
            user_id: adviser.id,
            type: "treasurer_signup_pending",
            payload_json: {
              applicant_id: authUserId,
              applicant_name: name,
              department_id: departmentId,
            },
            read: false,
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
