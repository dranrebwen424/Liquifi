"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileImage, X, Loader2, Camera, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { prepareImage } from "@/lib/image";
import type { ParsedReceipt } from "@/agent/types";
import { CameraViewfinder } from "@/components/entries/CameraViewfinder";
import { ReceiptFeedbackDialog, type ReceiptFeedbackKind } from "@/components/entries/ReceiptFeedbackDialog";

export type ParsedUploadResult = {
  entryId: string;
  parsed: ParsedReceipt;
};

type ReceiptUploadProps = {
  eventId: string;
  /** Called when the server returns a successful parse (Entry row created at ai_parsed). */
  onParsed: (result: ParsedUploadResult) => void;
  /** Called after the bounded reparse attempts run out — surface the manual-entry fallback. */
  onExhausted: () => void;
  /** Called when the model judges the image is not a traceable receipt — one-tap into No Receipt Entry. */
  onNoReceipt: () => void;
  /** Called with the provisional entryId when an inline parse failed transiently and
   *  the client retries via the reparse route — so the owner can clean up the
   *  `pending_ai_parse` row if the modal closes mid-retry. */
  onPending: (entryId: string) => void;
};

/**
 * Upload failures. Verdicts (invalid_document/borderline) are guidance, not errors —
 * they open receipt guidance without counting toward the attempt ceiling.
 * Generic failures and exhausted retries use the same white dialog. The reparse
 * ceiling (MAX_ATTEMPTS) only ever trips on genuinely hard-to-read receipt images.
 */
type FailureKind = ReceiptFeedbackKind;

/** Maximum file size in bytes (10 MB). */
const MAX_SIZE = 10 * 1024 * 1024;

/** Accepted MIME types for image upload. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/** Parse failures that count toward the manual-entry fallback. */
// 2026-09-04: 3 total attempts == primary + 2 reparse retries, each an
// 8s-cold-start round trip → ~25s worst case (the reported 20-30s). The model
// itself parses in 2-3s warm, so the multiplier is pure cold-start retries, not
// slow inference. Drop to 2 = primary + 1 reparse (~17s worst). 
const MAX_ATTEMPTS = 2;

/** Backoff between reparse retries after a transient "parsing" response. */
const RETRY_DELAY_MS = 900;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ReceiptUpload({ eventId, onParsed, onExhausted, onNoReceipt, onPending }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: FailureKind; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const resetFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setFailure(null);
    setFailedAttempts(0);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const validateAndSet = useCallback((f: File) => {
    setFailure(null);
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setFailure({ kind: "generic", message: "Only image files are accepted (JPEG, PNG, WebP)." });
      return;
    }
    if (f.size > MAX_SIZE) {
      setFailure({ kind: "generic", message: "File is too large. Maximum size is 10 MB." });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) validateAndSet(dropped);
    },
    [validateAndSet],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        setShowCamera(false); // picked via the camera overlay's "Use Photo Library"
        validateAndSet(selected);
      }
    },
    [validateAndSet],
  );

  /** Camera shutter → same validate/preview/upload pipeline as any other file. */
  const handleCameraCapture = useCallback(
    (f: File) => {
      setShowCamera(false);
      validateAndSet(f);
    },
    [validateAndSet],
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setFailure(null);

    // Prepare ONCE — re-encoding is wasteful, and this same blob backs the reparse retry.
    const prepared = await prepareImage(file);

    // Map a server error `code` to a banner kind. Verdicts become their guidance
    // banner; everything else falls back to the generic inline error.
    const verdictKind = (code: string | undefined): FailureKind => {
      if (code === "invalid_document" || code === "borderline" || code === "multiple_documents") {
        return code;
      }
      return "generic";
    };

    // ── Single-request fast path: the server runs Gemini inline and returns the
    //    parsed receipt in ONE round trip (~2–4s). No poll in the happy path.
    try {
      const formData = new FormData();
      formData.append("eventId", eventId);
      formData.append("image", prepared);

      const res = await fetch("/api/entries/receipt", { method: "POST", body: formData });
      const body = await res.json().catch(() => null);

      // Success — one round trip, done. The row is already ai_parsed server-side.
      if (res.ok && body?.status === "parsed" && body?.parsed) {
        setUploading(false);
        onParsed({ entryId: body.entry?.id, parsed: body.parsed });
        return;
      }

      // Server kicked off the parse but Gemini failed transiently → it returned the
      // provisional entryId; retry against the reparse route on the SAME row (no
      // image re-upload, no duplicate blob). Bounded.
      const entryId = body?.entry?.id;
      if (res.ok && body?.status === "parsing" && entryId) {
        // Hand the provisional id up so the modal can discard it if it closes mid-retry.
        onPending(entryId);
        let attempt = 0;
        while (attempt < MAX_ATTEMPTS - 1) {
          await sleep(RETRY_DELAY_MS);
          attempt += 1;
          let rr: Response;
          let rb: any;
          try {
            const fd = new FormData();
            fd.append("eventId", eventId);
            rr = await fetch(`/api/entries/receipt/${entryId}`, { method: "POST", body: fd });
            rb = await rr.json().catch(() => null);
          } catch {
            continue; // network blip — retry
          }
          if (rb?.status === "parsed" && rb?.parsed) {
            setUploading(false);
            onParsed({ entryId, parsed: rb.parsed });
            return;
          }
          if (rr.ok && rb?.status === "parsing") continue; // still extracting — retry
          // Terminal on reparse: verdict or duplicate.
          setFailure({ kind: verdictKind(rb?.code), message: rb?.error ?? "Something went wrong." });
          setUploading(false);
          return;
        }
        // Reparse exhausted → manual-entry fallback (the provisional row likely
        // remains; onPending lets the owner discard it on modal close).
        setFailedAttempts(failedAttempts + MAX_ATTEMPTS);
        setFailure({ kind: "exhausted", message: `After ${MAX_ATTEMPTS} attempts the receipt could not be parsed. You can try another photo or enter the entry manually.` });
        setUploading(false);
        return;
      }

      // Terminal on the primary request — verdict/duplicate, or parsing with no
      // entryId (nothing to retry): surface the message.
      setFailure({ kind: verdictKind(body?.code), message: body?.error ?? "Something went wrong." });
      setUploading(false);
    } catch {
      setFailure({ kind: "generic", message: "Could not reach the server. Check your connection and try again." });
      setUploading(false);
    }
  }, [file, eventId, onParsed, onPending, failedAttempts]);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Upload zone — shown when no file is selected */}
      {!file && (
        <>
          {/* Mobile source chooser — drag-drop is useless on touch, so the camera leads */}
          <div className="flex flex-col gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              Take a Photo
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              <Image className="h-4 w-4" />
              Choose from Library
            </button>
            <p className="text-center text-[11px] text-text-muted">
              One receipt per photo — shoot each receipt separately.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "hidden cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors md:flex lg:min-h-64 lg:justify-center lg:rounded-2xl lg:border lg:p-10 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-4 lg:focus-visible:outline-accent",
              isDragOver
                ? "border-accent bg-accent-muted"
                : "border-border-strong bg-surface hover:border-accent hover:bg-accent-muted lg:border-border lg:hover:bg-surface-secondary",
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            aria-label="Upload receipt image"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent lg:mb-2 lg:size-14 lg:rounded-2xl lg:bg-surface-secondary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                <span className="lg:hidden">Click to upload or drag and drop</span><span className="hidden lg:inline">Drop your receipt here</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">
                JPEG, PNG, or WebP — one receipt per upload
              </p>
            </div>
            <span className="mt-2 hidden min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground lg:inline-flex">Choose a photo</span>
            <p className="hidden text-xs text-text-muted lg:block">Maximum file size: 10 MB</p>
          </div>
        </>
      )}

      {/* Selected file preview */}
      {file && preview && (
        <div className="flex flex-col gap-4">
          {/* Image preview */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface-secondary">
            <img
              src={preview}
              alt="Receipt preview"
              className="max-h-[400px] w-full object-contain"
            />
            <button
              onClick={resetFile}
              disabled={uploading}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-secondary shadow transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* File info row */}
          <div className="flex items-center gap-3 text-sm">
            <FileImage className="h-5 w-5 shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {file.name}
              </p>
              <p className="text-xs text-text-muted">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "Parsing receipt…" : "Upload & Parse Receipt"}
          </button>

          {uploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-light">
              <div className="h-full w-full origin-left animate-pulse rounded-full bg-accent" />
            </div>
          )}
        </div>
      )}

      <ReceiptFeedbackDialog
        kind={!uploading ? failure?.kind ?? null : null}
        message={failure?.message ?? ""}
        onClose={() => setFailure(null)}
        onRetry={() => {
          const retrySamePhoto = file && (failure?.kind === "generic" || failure?.kind === "parse_failed");
          setFailure(null);
          if (retrySamePhoto) void handleUpload();
          else resetFile();
        }}
        onManual={() => {
          const exhausted = failure?.kind === "exhausted";
          setFailure(null);
          if (exhausted) onExhausted();
          else onNoReceipt();
        }}
      />

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Full-screen camera — portaled to document.body */}
      {showCamera && (
        <CameraViewfinder
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          onUseLibrary={() => inputRef.current?.click()}
        />
      )}
    </div>
  );
}
