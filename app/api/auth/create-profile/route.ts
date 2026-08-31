import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { notificationContent } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/web-push";

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

    // Notify the appropriate approver. This must run AFTER the users row is
    // created: the adviser lookup depends on get_user_department_id(), which
    // reads THIS user's department_id off the users table. Before the row
    // exists (e.g. in /signup/complete, which runs pre-OTP) that lookup returns
    // NULL and the notification silently never fires — that was the bug.
    // ponytail: notification failures are non-fatal — the approval UI surfaces pending users directly.
    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
    try {
      // Insert notification rows for approvers inside SECURITY DEFINER RPC.
      // Admins (null dept) are invisible to the signup session under
      // `users_dept_read`, AND that same RLS hides them inside a normal INSERT
      // policy's subquery — so the row insert must run as SECURITY DEFINER.
      // The RPC inserts the rows and returns the recipient ids so we can push.
      const { data: recipients, error: notifyErr } = await insforge.database.rpc(
        "notify_signup_approvers",
        { p_role: role, p_department_id: dept.id, p_name: name, p_email: email },
      );
      if (notifyErr) {
        console.error("[auth/create-profile] notify_signup_approvers rpc failed:", notifyErr);
      }
      const ids = (recipients as Array<{ id: string }> | null)?.map((r) => r.id) ?? [];

      // Push to each recipient (push subs are read via get_user_push_subscriptions RPC).
      const type = role === "adviser" ? "adviser_signup_pending" : "treasurer_signup_pending";
      const content = notificationContent(type, {
        applicant_email: email,
        applicant_name: name,
        department_id: dept.id,
      });
      await Promise.allSettled(ids.map((id) => sendPushToUser(id, content)));
    } catch (notifErr) {
      console.error("[auth/create-profile] notification error:", notifErr);
      // Non-fatal — the approval UI surfaces pending users from the users table.
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
