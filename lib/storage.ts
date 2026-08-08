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
 * Delete a receipt image by entry id. Best-effort by design: a failed or
 * orphaned delete logs and never throws — the caller must not fail the
 * discard because the blob is gone. Uses the stored `image_url` key as-is.
 *
 * `knownImageUrl` skips the DB re-read — required when the caller has already
 * deleted the entry row (the key captured before the delete must be passed in,
 * otherwise the re-read finds no row and the blob silently orphans).
 */
export async function deleteReceiptBlob(
  entryId: string,
  knownImageUrl?: string | null,
): Promise<void> {
  try {
    const insforge = await createInsforgeServer();
    let key: string | null | undefined = knownImageUrl;
    if (!key) {
      const { data: entry } = await insforge.database
        .from("entries")
        .select("image_url")
        .eq("id", entryId)
        .maybeSingle();
      key = entry?.image_url;
    }

    if (!key) return; // nothing to delete — already gone or never uploaded

    const { error } = await insforge.storage
      .from(RECEIPT_BUCKET)
      .remove(key);
    if (error) {
      // ponytail: orphaned blob is acceptable; audit trail keeps the entry history
      console.error("[storage] deleteReceiptBlob: blob delete failed:", key, error);
    }
  } catch (error) {
    console.error("[storage] deleteReceiptBlob:", error);
  }
}

/**
 * Download a receipt image blob for an entry.
 * Ownership is enforced by the caller (route-level requireRole) — the stored
 * `image_url` key is used as-is, so this stays valid if the key pattern changes.
 */
export async function getReceiptBlob(entryId: string): Promise<Blob> {
  const insforge = await createInsforgeServer();
  const { data: entry, error } = await insforge.database
    .from("entries")
    .select("id, image_url")
    .eq("id", entryId)
    .single();

  if (error || !entry || !entry.image_url) throw new Error("Entry not found");

  const { data: blob, error: downloadError } = await insforge.storage
    .from(RECEIPT_BUCKET)
    .download(entry.image_url);

  if (downloadError || !blob) throw new Error("Receipt not found");
  return blob;
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

/**
 * Upload the generated report PDF (Step 20). Lives in the same
 * signed-reports folder as the signed pages: {deptId}/reports/{reportId}/report.pdf.
 * Ownership was verified by the calling route — helper stays thin.
 */
export async function uploadReportPdf(
  deptId: string,
  reportId: string,
  file: Blob,
): Promise<string> {
  const insforge = await createInsforgeServer();
  const key = `${deptId}/reports/${reportId}/report.pdf`;
  const { error } = await insforge.storage
    .from(SIGNED_REPORT_BUCKET)
    .upload(key, file); // content type rides on the Blob (see route)

  if (error) throw new Error("Upload failed");
  return key;
}

/**
 * Download the generated report PDF by report id. `pdf_url` stores the storage
 * key (never a browser-loadable URL — no signed-URL support in the SDK), so
 * reads go through the authed proxy route. Ownership is enforced by the caller.
 */
export async function getReportPdfBlob(reportId: string): Promise<Blob> {
  const insforge = await createInsforgeServer();
  const { data: report, error } = await insforge.database
    .from("reports")
    .select("id, pdf_url")
    .eq("id", reportId)
    .single();

  if (error || !report || !report.pdf_url) throw new Error("Report not found");

  const { data: blob, error: downloadError } = await insforge.storage
    .from(SIGNED_REPORT_BUCKET)
    .download(report.pdf_url);

  if (downloadError || !blob) throw new Error("Report PDF not found");
  return blob;
}
