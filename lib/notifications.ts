import { createInsforgeServer } from "@/lib/insforge-server";
import { sendPushToUser } from "@/lib/web-push";

// Central notification helper: one row-insert + push path shared by every
// mutating route/action, and one type→{title, body, url} map shared by the
// push payloads AND the notification list pages.

type Payload = Record<string, unknown>;

export type NotificationContent = { title: string; body: string; url: string };

/**
 * Title/body/deep-link for a notification type. Falls back to a generic
 * "Notification" row when the type is unknown (never crashes rendering).
 */
export function notificationContent(type: string, payload: Payload): NotificationContent {
  const eventId = typeof payload.event_id === "string" ? payload.event_id : "";
  const fs = typeof payload.fs_document_number === "string" ? payload.fs_document_number : "";
  const eventName = typeof payload.event_name === "string" ? payload.event_name : "an event";
  const name = typeof payload.applicant_name === "string" ? payload.applicant_name : "A user";

  switch (type) {
    case "report_ready_for_approval":
      return {
        title: "Report ready for approval",
        body: `${eventName} — ${fs} is awaiting your approval.`,
        url: `/adviser/reports/${eventId}`,
      };
    case "report_approved":
      return {
        title: "Report approved",
        body: `${eventName} — ${fs} has been approved.`,
        url: `/treasurer/reports/${eventId}`,
      };
    case "report_rejected": {
      const reason =
        typeof payload.rejection_reason === "string" ? payload.rejection_reason : "";
      return {
        title: "Report rejected",
        body: `${eventName} — ${fs} was rejected${reason ? `: ${reason}` : ""}.`,
        url: `/treasurer/reports/${eventId}`,
      };
    }
    case "adviser_signup_pending":
      return {
        title: "New adviser signup",
        body: `${name} is waiting for approval.`,
        url: "/admin/approvals",
      };
    case "treasurer_signup_pending":
      return {
        title: "New treasurer signup",
        body: `${name} is waiting for your approval.`,
        url: "/adviser/approvals",
      };
    case "signup_approved":
      return {
        title: "Account approved",
        body: `Welcome, ${name}! You can now log in.`,
        url: "/login",
      };
    case "signup_rejected":
      return {
        title: "Account request not approved",
        body: `Hi ${name}, your registration request was reviewed and not approved.`,
        url: "/login",
      };
    case "manual_entry_pending": {
      const amount = typeof payload.amount === "number" ? payload.amount : null;
      return {
        title: "New entry for approval",
        body: `A manual entry${amount !== null ? ` of ₱${amount.toFixed(2)}` : ""} awaits your approval.`,
        url: "/adviser/approvals",
      };
    }
    case "entry_rejected": {
      const reason = typeof payload.reason === "string" ? payload.reason : "";
      return {
        title: "Entry rejected",
        body: `Your entry was rejected${reason ? `: ${reason}` : ""}.`,
        url: `/treasurer/events/${eventId}`,
      };
    }
    case "entry_approved": {
      const amount = typeof payload.amount === "number" ? payload.amount : null;
      return {
        title: "Entry approved",
        body: `A manual entry${amount !== null ? ` of ₱${amount.toFixed(2)}` : ""} was approved.`,
        url: `/treasurer/events/${eventId}`,
      };
    }
    case "event_overspend": {
      return {
        title: "Budget overrun",
        body: `${eventName} exceeded its budget.`,
        url: `/adviser/events/${eventId}`,
      };
    }
    default:
      return { title: "Notification", body: "You have a new notification.", url: "" };
  }
}

/**
 * Insert a notification row (or rows) and send push to every recipient.
 * Never throws — both the row insert and the push are best-effort, mirroring
 * the pre-existing per-site try/catch behavior.
 */
export async function createNotification(
  userIds: string | string[],
  type: string,
  payload: Payload,
) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;

  try {
    const insforge = await createInsforgeServer();
    await insforge.database
      .from("notifications")
      .insert(ids.map((user_id) => ({ user_id, type, payload_json: payload, read: false })));
  } catch (err) {
    console.error(`[notifications] insert ${type} failed:`, err);
    return;
  }

  const content = notificationContent(type, payload);
  if (!content.url) return; // unknown type — rows are kept, no push
  for (const id of ids) {
    await sendPushToUser(id, content);
  }
}
