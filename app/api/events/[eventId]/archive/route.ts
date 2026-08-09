import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  uploadSignedReport,
  deleteSignedReportPage,
  getReportPdfBlob,
} from "@/lib/storage";
import {
  verifySignedDocument,
  countPdfPages,
} from "@/agent/document-verifier";

// Step 25 — Archive Event. The treasurer uploads every page of the fully
// signed report; OpenRouter verifies completeness (fs number, signature marks,
// page count); on full pass the event is terminal-archived with the signed
// pages stored. Any check fails → uploads rolled back, nothing saved, the
// modal stays open with per-check reasons.

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

type Props = {
  params: Promise<{ eventId: string }>;
};

export async function POST(request: NextRequest, { params }: Props) {
  // Uploaded blob keys — rolled back if any check fails, so nothing survives
  // a rejected archive.
  const uploadedKeys: string[] = [];

  try {
    const user = await requireRole("treasurer");
    const { eventId } = await params;
    const insforge = await createInsforgeServer();

    // ── Preconditions ──
    const { data: event } = await insforge.database
      .from("events")
      .select("id, department_id, name, status")
      .eq("id", eventId)
      .single();
    if (!event) return errorResponse("Event not found.", 404);
    if (event.department_id !== user.departmentId) {
      return errorResponse("Forbidden.", 403);
    }
    if (event.status === "archived") {
      return errorResponse("This event is already archived.", 409);
    }

    // Latest approved report — archiving is only reachable from an approved report.
    const { data: report } = await insforge.database
      .from("reports")
      .select("id, event_id, fs_document_number, status, pdf_url")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report) {
      return errorResponse("No approved report found for this event.", 409);
    }

    // Unresolved overspend blocks archiving (see auth-matrix).
    const { data: unresolvedRows, error: overspendError } = await insforge.database
      .from("entries")
      .select("id")
      .eq("event_id", eventId)
      .eq("status", "deducted")
      .eq("causes_overspend", true)
      .is("overspend_resolved_at", null);
    if (overspendError) {
      console.error("[api/events/archive] overspend check failed:", overspendError);
      return errorResponse("Failed to check overspend state.", 500);
    }
    if ((unresolvedRows?.length ?? 0) > 0) {
      return errorResponse("Resolve the unresolved overspend before archiving.", 409);
    }

    // Expected signatories — the verifier checks a mark per block.
    const { data: signatories } = await insforge.database
      .from("report_signatories")
      .select("position, full_name")
      .eq("report_id", report.id)
      .order("sort_order", { ascending: true });

    // ── Multipart upload (one file per signed page, "pages" field) ──
    const formData = await request.formData();
    const files = formData.getAll("pages").filter(
      (entry): entry is File => entry instanceof File,
    );
    if (files.length === 0) {
      return errorResponse("Upload at least one signed page.", 400);
    }
    // Mirror the receipt route's image-size sanity bound.
    const MAX_BYTES = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size === 0) return errorResponse("One of the uploaded pages is empty.", 400);
      if (file.size > MAX_BYTES) {
        return errorResponse("Each signed page must be 10 MB or smaller.", 400);
      }
    }

    const signedUrls: string[] = [];
    const pagesAsDataUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const { key } = await uploadSignedReport(report.id, i + 1, files[i]);
      uploadedKeys.push(key);
      signedUrls.push(key);
      pagesAsDataUrls.push(
        `data:${files[i].type || "image/jpeg"};base64,${Buffer.from(
          await files[i].arrayBuffer(),
        ).toString("base64")}`,
      );
    }

    // ── Verify (completeness/presence only — never authenticity) ──
    const pdfBlob = await getReportPdfBlob(report.id);
    const expectedPageCount = countPdfPages(
      new Uint8Array(await pdfBlob.arrayBuffer()),
    );
    const result = await verifySignedDocument({
      fsDocumentNumber: report.fs_document_number,
      signatories: signatories ?? [],
      pages: pagesAsDataUrls,
    });

    const pageCountOk = result.pageCountObserved === expectedPageCount;
    const failedChecks: Record<string, { passed: boolean; reason: string }> = {
      document_number: result.checks.document_number,
      signatures: result.checks.signatures,
      page_count: {
        passed: pageCountOk,
        reason: pageCountOk
          ? `Expected ${expectedPageCount} page${expectedPageCount === 1 ? "" : "s"}, found ${result.pageCountObserved}.`
          : `Expected ${expectedPageCount} page${expectedPageCount === 1 ? "" : "s"} (matching the generated report), found ${result.pageCountObserved}.`,
      },
    };

    if (!result.checks.document_number.passed || !result.checks.signatures.passed || !pageCountOk) {
      // Roll back uploaded blobs — nothing saved on failure.
      await Promise.all(uploadedKeys.map((key) => deleteSignedReportPage(key)));
      return NextResponse.json(
        {
          success: false,
          error: "Signed-document check failed.",
          checks: failedChecks,
          summary: result.summary,
        },
        { status: 422 },
      );
    }

    // ── Race-safe terminal archive: event must still be open ──
    const now = new Date().toISOString();
    const { data: updatedEvent, error: updateError } = await insforge.database
      .from("events")
      .update({ status: "archived", archived_at: now, archived_by: user.id })
      .eq("id", eventId)
      .eq("status", "open")
      .select("id");
    if (updateError) {
      console.error("[api/events/archive] event update failed:", updateError);
      await Promise.all(uploadedKeys.map((key) => deleteSignedReportPage(key)));
      return errorResponse("Failed to archive the event.", 500);
    }
    if (!updatedEvent || updatedEvent.length === 0) {
      await Promise.all(uploadedKeys.map((key) => deleteSignedReportPage(key)));
      return errorResponse("This event is already archived.", 409);
    }

    // Persist the signed pages on the report (already verified).
    await insforge.database
      .from("reports")
      .update({
        signed_document_urls: signedUrls,
        signed_page_count: expectedPageCount,
        signing_confirmed_by: user.id,
        signing_confirmed_at: now,
      })
      .eq("id", report.id);

    // Audit log.
    await insforge.database.from("audit_logs").insert([
      {
        actor_id: user.id,
        department_id: event.department_id,
        action: "event.archived",
        target_type: "event",
        target_id: eventId,
        metadata_json: {
          event_id: eventId,
          fs_document_number: report.fs_document_number,
          report_id: report.id,
          signed_page_count: expectedPageCount,
          signatory_count: signatories?.length ?? 0,
        },
      },
    ]);

    revalidatePath("/treasurer/home");
    revalidatePath(`/treasurer/events/${eventId}`);
    revalidatePath(`/treasurer/reports/${eventId}`);

    return NextResponse.json({
      success: true,
      event: { id: eventId, status: "archived" },
      fs_document_number: report.fs_document_number,
    });
  } catch (err) {
    // Roll back any uploads made before the failure.
    await Promise.all(uploadedKeys.map((key) => deleteSignedReportPage(key)));
    if (err instanceof Error && "code" in err) {
      const status = (err as Error & { status?: unknown }).status;
      return errorResponse(err.message, typeof status === "number" ? status : 403);
    }
    console.error("[api/events/archive]", err);
    return errorResponse("Something went wrong.", 500);
  }
}
