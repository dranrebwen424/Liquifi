# Memory — 3-Outome Guided Upload + Camera Plan

Last updated: 2026-08-02

## What was built

### 3-outcome guided upload (valid / borderline / invalid)
Per user design — never just "rejected", always guide with the next step.

- **`agent/types.ts`** — New `classificationSchema` (`outcome`: valid|borderline|invalid, `reason`); `receiptResponseSchema` = nullable fields + `superRefine` (valid ⇒ supplier_name, amount, ≥1 item_breakdown required); strict `receiptParseSchema` now `document_number: z.string()` / `document_type_raw: z.string()` / `issue_date: z.string()` (may be `""` — fixes the `document_number — expected string, received null` 422 on numberless receipts); `ParseOutcome` union type: `{ outcome:"valid"; receipt } | { outcome:"borderline"|"invalid"; reason }`.
- **`agent/receipt-parser.ts`** — Prompt Rules 3 addendum (no label-tied number → `""`, never null/never made-up) + Rule 8 (classification block: valid/borderline/invalid, doubt → borderline, never invalid) + Rule 9 (NEVER guess unreadable fields — null; unreadable vendor/amount ⇒ borderline). `parseReceipt` returns discriminated `ParseOutcome`. Verdicts short-circuit (no Entry row, no retry); 3× retry only on malformed JSON/schema mismatch. `GeminiError` rethrows.
- **`app/api/entries/receipt/route.ts`** — `GUIDANCE` const with user's exact copy (invalid_document + borderline). Verdicts → 422 `{ code: "invalid_document"|"borderline", error: guidance }` + `audit_logs` insert (`action: entry.receipt_invalid_document|entry.receipt_borderline`, `target_type: "event"`, `target_id: eventId` — audit_logs.target_id is NOT NULL). `parse` block moved before `insforge` creation. Dup check already skips falsy `""` numbers (line ~101).
- **`components/entries/ReceiptUpload.tsx`** — `error: string` → `failure: { kind: FailureKind; message } | null`; `FailureKind = "generic" | "parse_failed" | "invalid_document" | "borderline"`; only `parse_failed` increments `failedAttempts`; new `onNoReceipt` prop; two verdict banners: `invalid_document` (warning shell, primary "Log as No Receipt Entry" with Pencil icon, secondary "Try Another Photo") and `borderline` (info shell, primary "Try Another Photo" with RefreshCw icon, secondary "Log as No Receipt Entry"). RefreshCw now imported. 3-attempt fallback banner pre-exists.
- **`components/entries/LogEntryModal.tsx`** — Shared `switchToManual` handler (`setMethod("manual")` + `setManualScreen("picker")` + `setSelectedCategory(null)`) wired to both `onExhausted` and `onNoReceipt`.
- **`app/treasurer/events/[eventId]/entries/new/page.tsx`** — `onNoReceipt` wired to the standalone fallback page (same manual-switch handler as LogEntryModal).
- **Docs updated:** AGENTS.md (classification block + Rules 3/8/9 + dup-check `""` note), library-docs.md (table + Classification + Error handling), ui-registry.md (ReceiptUpload verdict banners + pattern notes + LogEntryModal switchToManual), progress-tracker.md (08-02 bullet with full verification log including the hallucination finding).

### Classification bench + hallucination fix
- **Prompt Rule 9 added** after first bench run: heavy-blur fixture returned confidently-wrong values (382915 / 2025-07-23 / ₱3,782.50) as `valid` — the hallucination the design exists to prevent. Rule 9: "NEVER guess unreadable fields — null; unreadable vendor/amount ⇒ borderline". Re-run: blurred → borderline with honest reason, all pass.
- **Bench script** at `%TEMP%\opencode\bench-3outcome.mts` (4 fixtures, production `parseReceipt`, GT assertions). Fixtures: test-receipt.png → valid (all 7 fields exact), downscaled 1600px → valid, synthetic blank (PowerShell System.Drawing) → invalid, synthetic heavy-blur → borderline.
- **`tsc --noEmit` clean**, **`next build` passes** (24 static pages, `/api/entries/receipt` route present).

## Decisions made

- **Three approved defaults (user said "proceed"):**
  1. Valid = vendor + amount readable (printed or handwritten, any doc type); number optional (`""`); invalid specifically = no number AND no vendor.
  2. Verdicts (borderline/invalid) return after ONE call, never count against the 3-attempt ceiling (ceiling = `parse_failed` only).
  3. Borderline banner offers "Try a clearer photo?" first, "Log as No Receipt Entry" second.
- **Invalid-document banner: warning shell** (border-warning bg-warning-lightest). Borderline banner: info shell (border-info bg-info-lightest).
- **Verdicts audit to `event` not `entry`** — `audit_logs.target_id` is NOT NULL, so target_type is "event" with target_id = eventId.
- **Native camera via `capture="environment"` was approved**, then user clarified design has **L-brackets inside a live camera viewfinder** → plan revised to in-app getUserMedia viewfinder (see Open Questions / Next session below).
- **ManualQuickForm attachment gets same two-source treatment** — camera + gallery, user confirmed.
- **In-app viewfinder vs native camera: in-app wins** — user's design requires L-brackets framing a live camera feed; native camera app can't render our overlays.

## Problems solved

- **`document_number — expected string, received null` 422 on numberless receipts** — strict `receiptParseSchema` required `.min(1)` on `document_number`; loosened to `z.string()` (allows `""`), matching the prompt Rule 3 addendum.
- **`onNoReceipt` missing from component destructure** — `ReceiptUpload.tsx` had the prop in the type but never destructured it; also missing from the standalone `/entries/new` page. Fixed both, `tsc` clean.
- **Hallucination on blurred images** — heavy-blur fixture returned confident-wrong values (382915, 2025-07-23, ₱3,782.50) as `valid`. Fixed with prompt Rule 9 ("NEVER guess unreadable fields — null; unreadable vendor/amount ⇒ borderline"). Bench re-run: all pass.
- **Progress-tracker clobbered benchmark heading** — the 08-02 bullet edit accidentally ate the "2026-08-01 — Model benchmark: 3.5-flash-lite shipped over 3.1-flash-lite" heading line. Restored.

## Current state

- **3-outcome guided upload:** DONE and verified. All tests pass, build green.
- **Mobile camera capture:** NOT YET IMPLEMENTED. Current ReceiptUpload has a hidden `<input type="file">` with no `capture` attribute — on iOS Safari this opens photo library only, so a treasurer with a paper receipt cannot photograph it. The in-app camera viewfinder plan exists (see next session) but has not been built.
- **ManualQuickForm photo attachment:** Same no-capture gap as ReceiptUpload. Two-source treatment planned but not built.
- **Step 15 (Entry Deduction):** Still open — unanswered question from previous sessions (treasurer-confirm = instant deduct vs adviser pending_approval).
- **User's original failing receipt:** Never arrived in `%TEMP%\opencode`. Numberless-receipt `""` fix is type-verified but not image-verified with a real photo. Drop the real file in to verify.

## Next session starts with

**Build the in-app camera viewfinder with L-bracket corner brackets.**

Plan details (revised from approved native-camera plan):

1. **New `components/entries/CameraViewfinder.tsx`** (~150 lines, `"use client"`):
   - Full-screen fixed overlay (`fixed inset-0 z-50 bg-black`).
   - `<video autoPlay playsInline muted>` — the three attributes iOS Safari requires.
   - `getUserMedia({ video: { facingMode: "environment", width: {ideal: 1920}, height: {ideal: 1080} } })` with bare `{ video: true }` retry for older iOS.
   - **L-brackets:** pointer-events-none overlay SVG, `stroke="white"` strokeWidth ~3, four corner paths inset ~16px.
   - Controls: shutter (bottom-center white ring 64px), close ✕ (top-left), flip camera (top-right, `SwitchCamera` icon — switches facingMode user/environment by restarting stream).
   - **Capture:** draw video frame → `canvas.toBlob("image/jpeg", 0.92)` → `File` → handed to existing `validateAndSet` → standard preview + `prepareImage` downscale + upload/parse. No duplicated resize logic.
   - **Lifecycle:** stop all tracks on unmount. Error states: `NotAllowedError` → card + "Use Photo Library" fallback + note that refresh resets permission. `NotFoundError` → library fallback. Never a dead end.
   - **HTTPS required:** prod is HTTPS (InsForge hosting), dev is localhost — both fine.
   - Skipped (ponytail): torch/flash, zoom, autofocus tap.

2. **`ReceiptUpload.tsx` changes:**
   - Mobile block: "Take a Photo" opens `CameraViewfinder` (showCamera state), "Choose from Library" opens plain file input (no capture attr — the imperative capture trick is no longer needed).
   - `onCapture(file)` → `validateAndSet(file)` (existing path: preview → prepareImage → upload → parse).
   - Desktop drag-drop zone unchanged.
   - Verdict/retake banners unchanged (`resetFile` returns to chooser).

3. **`ManualQuickForm.tsx` changes:**
   - Same `CameraViewfinder` reused — "Take Photo" feeds photoFile state, "Choose from Library" keeps plain input.
   - Preview chip + handlePhotoSelect unchanged.

4. **Verification:**
   - `tsc --noEmit`, `next build`.
   - Playwright with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`: assert viewfinder opens, `<video>` gets srcObject, L-bracket SVG renders, shutter click produces file → preview + upload button appear. Mobile emulation asserts chooser buttons on both screens.
   - Real-device camera + permission = manual QA.

5. **Docs:** ui-registry (new CameraViewfinder entry + ReceiptUpload/ManualQuickForm updates), progress-tracker bullet.

6. **Effort:** M (~half a day). The component is straightforward; getUserMedia platform quirks are the risk, mitigated by bare-constraint retry and library fallback.

## Open questions

- **Step 15 deduction semantics:** Treasurer-confirm receipt entry — does it deduct from budget immediately, or go to `pending_approval` for the adviser? This determines the entire entry status flow (draft → ai_parsed → deducted vs pending_approval → approved → deducted). Still unanswered. Must be resolved before building Step 15.
- **HEIC on iOS:** Camera shoots HEIC; `prepareImage` passes it through raw; server returns friendly decode error. Server-side HEIC decode (via sharp) is a separate follow-up — out of scope for camera viewfinder. Acceptable as-is.
