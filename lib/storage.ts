import { createInsforgeServer } from "@/lib/insforge-server";

// ponytail: presigned URL expiry is S3 default, adjust if needed
const RECEIPT_BUCKET = "receipts" as const;
const SIGNED_REPORT_BUCKET = "signed-reports" as const;

async function getUserDeptId(): Promise<string | null> {
  const insforge = await createInsforgeServer();
  const { data } = await insforge.auth.getCurrentUser();
  const user = data?.user;
  if (!user) return null;
  const { data: profile } = await insforge.database
    .from("users")
    .select("department_id")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.department_id ?? null;
}

// ─── Receipts ──────────────────────────────────────────────────────

/**
 * Upload receipt image.
 */
export async function uploadReceipt(
  eventId: string,
  entryId: string,
  file: File | Blob,
): Promise<{ url: string; key: string }> {
  const deptId = await getUserDeptId();
  if (!deptId) throw new Error("Authentication required");

  const insforge = await createInsforgeServer();
  const { data: event, error: eventError } = await insforge.database
    .from("events")
    .select("department_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) throw new Error("Event not found");
  if (event.department_id !== deptId) throw new Error("Unauthorized");

  const key = `${deptId}/events/${eventId}/receipts/${entryId}.jpg`;
  const { data, error } = await insforge.storage
    .from(RECEIPT_BUCKET)
    .upload(key, file);

  if (error || !data) throw new Error("Upload failed");
  return { url: data.url, key: data.key };
}

/**
 * Get presigned URL for receipt.
 */
export async function getReceiptUrl(
  eventId: string,
  entryId: string,
): Promise<string> {
  const deptId = await getUserDeptId();
  if (!deptId) throw new Error("Authentication required");

  const insforge = await createInsforgeServer();
  const { data: entry, error } = await insforge.database
    .from("entries")
    .select("id, event_id")
    .eq("id", entryId)
    .eq("event_id", eventId)
    .single();

  if (error || !entry) throw new Error("Entry not found");

  // Verify event belongs to user's department
  const { data: evt } = await insforge.database
    .from("events")
    .select("department_id")
    .eq("id", eventId)
    .single();
  if (!evt || evt.department_id !== deptId) throw new Error("Unauthorized");

  const key = `${deptId}/events/${eventId}/receipts/${entryId}.jpg`;
  const { data: blob } = await insforge.storage
    .from(RECEIPT_BUCKET)
    .download(key);

  // ponytail: client-side Blob URL for display — swap to presigned URL when auth is in place
  if (blob) return URL.createObjectURL(blob);
  throw new Error("Receipt not found");
}

// ─── Signed Reports ────────────────────────────────────────────────

/**
 * Upload signed report page.
 */
export async function uploadSignedReport(
  reportId: string,
  pageN: number,
  file: File | Blob,
): Promise<{ url: string; key: string }> {
  const deptId = await getUserDeptId();
  if (!deptId) throw new Error("Authentication required");

  const insforge = await createInsforgeServer();
  const { data: report, error: reportError } = await insforge.database
    .from("reports")
    .select("id, event_id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) throw new Error("Report not found");

  // Verify report belongs to user's department
  const { data: rptEvent } = await insforge.database
    .from("events")
    .select("department_id")
    .eq("id", report.event_id)
    .single();
  if (!rptEvent || rptEvent.department_id !== deptId) throw new Error("Unauthorized");

  const key = `${deptId}/reports/${reportId}/page-${pageN}.jpg`;
  const { data, error } = await insforge.storage
    .from(SIGNED_REPORT_BUCKET)
    .upload(key, file);

  if (error || !data) throw new Error("Upload failed");
  return { url: data.url, key: data.key };
}

/**
 * Get presigned URL for signed report page.
 */
export async function getSignedReportUrl(
  reportId: string,
  pageN: number,
): Promise<string> {
  const deptId = await getUserDeptId();
  if (!deptId) throw new Error("Authentication required");

  const insforge = await createInsforgeServer();
  const { data: report, error } = await insforge.database
    .from("reports")
    .select("id, event_id")
    .eq("id", reportId)
    .single();

  if (error || !report) throw new Error("Report not found");

  const { data: sigEvent } = await insforge.database
    .from("events")
    .select("department_id")
    .eq("id", report.event_id)
    .single();
  if (!sigEvent || sigEvent.department_id !== deptId) throw new Error("Unauthorized");

  const key = `${deptId}/reports/${reportId}/page-${pageN}.jpg`;
  const { data: blob } = await insforge.storage
    .from(SIGNED_REPORT_BUCKET)
    .download(key);

  if (blob) return URL.createObjectURL(blob);
  throw new Error("Report page not found");
}
