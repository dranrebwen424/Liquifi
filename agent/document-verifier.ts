// Signed-document completeness check — NOT a forgery/authenticity check.
// Server-only (imported by API routes). Verifies the uploaded signed pages of
// an approved report: fs_document_number matches, signature-like marks exist
// in each expected signatory block, and the number of distinct pages matches
// the generated PDF. Never throws on a failed verification — it returns a
// per-check verdict so the route can reject with reasons and keep nothing.

import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import {
  documentVerificationResponseSchema,
  type DocumentVerificationResult,
} from "@/agent/types";

const MODEL = "gpt-4o"; // pinned — see library-docs.md OpenRouter section
const ATTEMPTS = 3;

const SYSTEM_PROMPT = `You are a document completeness verifier for a Philippine college liquidation system. You are given images of the pages of a PHYSICALLY SIGNED liquidation report, uploaded by the department treasurer, plus the expected document number and the expected signatory list.

Your job is a COMPLETENESS/PRESENCE check ONLY. You verify what is present on the pages. You NEVER verify signature authenticity or forgery — a signature-like mark (any handwritten stroke over or near the printed signature line) counts as present.

Check three things:
1. document_number: the expected document number (e.g. "FS-CCS-2026-00001") must be visible, legibly and completely, on at least one of the uploaded pages. Pass ONLY if it matches the expected value exactly.
2. signatures: for EACH expected signatory (position + full name), there must be a signature-like mark near that signatory's printed name/signature-line block. Every signatory must have one. If any signatory block is missing or has no mark, that check fails.
3. page count: count the DISTINCT pages in the upload (do not double-count pages that appear to be the same image). A signed report is expected to be exactly the page(s) of the generated report. Do not fail this check on your own — just report the count; the system compares it against the expected page count.

Respond with ONLY JSON:
{"document_number": {"passed": true|false, "reason": "..."}, "signatures": {"passed": true|false, "reason": "..."}, "page_count_observed": <integer>, "summary": "..."}

Rules:
- Be honest and conservative: when in doubt about a signature mark being present, PASS with a note in the reason, never fail the archive on uncertainty — the treasurer can retry with better photos if it is a real gap.
- reasons must be one short, specific sentence.
- summary: one sentence describing what you saw.`;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

export type VerifySignedDocumentArgs = {
  fsDocumentNumber: string;
  signatories: { position: string; full_name: string }[];
  /** base64 data URLs of the uploaded signed pages, in upload order. */
  pages: string[];
};

/**
 * Runs the completeness check against OpenRouter.
 * @throws OpenRouterError on transport/auth failure only (caller may 500);
 *         a failed verification never throws — it returns the per-check verdict.
 */
export async function verifySignedDocument({
  fsDocumentNumber,
  signatories,
  pages,
}: VerifySignedDocumentArgs): Promise<DocumentVerificationResult> {
  const signatoryList = signatories
    .map((s) => `- ${s.position}: ${s.full_name}`)
    .join("\n");

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: [
        {
          type: "text",
          text: `Expected document number: ${fsDocumentNumber}\nExpected signatories:\n${signatoryList}\n\nVerify the uploaded signed pages below.`,
        },
        ...pages.map((page) => ({
          type: "image_url",
          image_url: { url: page },
        })),
      ],
    },
  ];

  let lastDetail = "no response";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    try {
      const text = await chatCompletion({
        model: MODEL,
        messages,
        responseFormat: { type: "json_object" },
      });
      const result = documentVerificationResponseSchema.safeParse(
        JSON.parse(stripCodeFences(text)),
      );
      if (result.success) {
        console.info(
          `[agent/document-verifier] verified in ${Date.now() - startedAt}ms (${MODEL})`,
        );
        const d = result.data;
        return {
          checks: {
            document_number: d.document_number,
            signatures: d.signatures,
          },
          pageCountObserved: d.page_count_observed,
          summary: d.summary,
        };
      }
      lastDetail = `schema mismatch: ${result.error.issues[0]?.path.join(".") ?? "?"} — ${result.error.issues[0]?.message ?? "invalid"}`;
    } catch (err) {
      if (err instanceof OpenRouterError) throw err; // transport/auth — no retry for a dead key
      lastDetail = err instanceof Error ? err.message : String(err);
    }
    console.warn(
      `[agent/document-verifier] attempt ${attempt}/${ATTEMPTS} failed (${Date.now() - startedAt}ms): ${lastDetail}`,
    );
  }

  // Verification itself failed (not transport) — report all checks as failed
  // with a generic reason so the route rejects with a retryable message.
  console.error("[agent/document-verifier] all attempts failed:", lastDetail);
  return {
    checks: {
      document_number: { passed: false, reason: "Verification service could not read the uploaded pages. Please retry with clearer photos." },
      signatures: { passed: false, reason: "Verification service could not read the uploaded pages. Please retry with clearer photos." },
    },
    pageCountObserved: pages.length,
    summary: "Verification failed after multiple attempts.",
  };
}

/**
 * Expected page count of the generated report PDF — parsed directly from the
 * PDF bytes. @react-pdf/renderer (PDFKit) writes the pages tree uncompressed,
 * so the /Count of the /Pages node is a plain regex away; no pdfjs (pdfjs-dist
 * is not Node-safe — see progress-tracker.md 21e). Fallback 1 (the template is
 * a single Page; overflow creates more pages but the root tree count still
 * matches).
 */
export function countPdfPages(buffer: Uint8Array): number {
  const text = Buffer.from(buffer).toString("latin1");
  const match = text.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
  const count = match ? Number(match[1]) : NaN;
  return Number.isFinite(count) && count > 0 ? count : 1;
}
