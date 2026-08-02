"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileImage, X, Loader2, Pencil, RefreshCw, Camera, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedReceipt } from "@/agent/types";
import { CameraViewfinder } from "@/components/entries/CameraViewfinder";

export type ParsedUploadResult = {
  entryId: string;
  parsed: ParsedReceipt;
};

type ReceiptUploadProps = {
  eventId: string;
  /** Called when the server returns a successful parse (Entry row created at ai_parsed). */
  onParsed: (result: ParsedUploadResult) => void;
  /** Called after 3 failed parse attempts — surface the manual-entry fallback. */
  onExhausted: () => void;
  /** Called when the model judges the image is not a traceable receipt — one-tap into No Receipt Entry. */
  onNoReceipt: () => void;
};

/**
 * Upload failures. Verdicts (invalid_document/borderline) are guidance, not errors —
 * they render an action banner immediately and never count toward the 3-attempt ceiling.
 * generic/parse_failed keep the inline red text + attempt counting.
 */
type FailureKind = "generic" | "parse_failed" | "invalid_document" | "borderline";

/** Maximum file size in bytes (10 MB). */
const MAX_SIZE = 10 * 1024 * 1024;

/** Accepted MIME types for image upload. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/** Parse failures that count toward the manual-entry fallback. */
const MAX_ATTEMPTS = 3;

/** Downscale cap for receipt photos (longest side, px). */
const MAX_DIM = 1600;
/** Images under this size are uploaded as-is — no pointless re-encode. */
const SKIP_IF_SMALL = 1 * 1024 * 1024;

/**
 * Shrink a receipt photo before upload: ≤1600px JPEG q0.8 (~200–400KB vs a
 * multi-MB phone photo). Gemini downscales internally anyway, so this skips
 * redundant upload + ingest work without losing OCR accuracy at this size.
 * ponytail: canvas-only, no library. Any failure returns the original file —
 * downscale is an optimization, never a blocker.
 */
async function prepareImage(file: File): Promise<File> {
  // HEIC can't be decoded by canvas — pass through raw so the server's friendly error still fires
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heic-sequence" ||
    file.type === "image/heif-sequence"
  ) {
    return file;
  }
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < SKIP_IF_SMALL) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return file;
    }
    ctx.fillStyle = "#fff"; // receipts are opaque — PNG transparency becomes white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ReceiptUpload({ eventId, onParsed, onExhausted, onNoReceipt }: ReceiptUploadProps) {
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

    try {
      const formData = new FormData();
      formData.append("eventId", eventId);
      formData.append("image", await prepareImage(file));

      const res = await fetch("/api/entries/receipt", { method: "POST", body: formData });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        const message = body?.error ?? "Something went wrong.";
        const code = body?.code;
        if (code === "invalid_document" || code === "borderline") {
          // Verdicts show guidance immediately and don't count toward the fallback ceiling
          setFailure({ kind: code, message });
        } else {
          if (code === "parse_failed") {
            setFailedAttempts(failedAttempts + 1);
          }
          setFailure({ kind: "generic", message });
        }
        setUploading(false);
        return;
      }

      setUploading(false);
      onParsed({ entryId: body.entry.id, parsed: body.parsed });
    } catch {
      setFailure({ kind: "generic", message: "Could not reach the server. Check your connection and try again." });
      setUploading(false);
    }
  }, [file, eventId, onParsed, failedAttempts]);

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
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "hidden cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors md:flex",
              isDragOver
                ? "border-accent bg-accent-muted"
                : "border-border-strong bg-surface hover:border-accent hover:bg-accent-muted",
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            aria-label="Upload receipt image"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Click to upload or drag and drop
              </p>
              <p className="mt-1 text-xs text-text-muted">
                JPEG, PNG, or WebP — one receipt per upload
              </p>
            </div>
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

          {/* Inline errors — validation, network, or persistent extraction failures */}
          {failure && (failure.kind === "generic" || failure.kind === "parse_failed") && (
            <p className="text-sm text-error">{failure.message}</p>
          )}

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

      {/* Invalid-document verdict — guidance banner, no dead end, no attempts consumed */}
      {!uploading && failure?.kind === "invalid_document" && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning bg-warning-lightest p-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              No receipt details found
            </p>
            <p className="mt-0.5 text-xs text-text-muted">{failure.message}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onNoReceipt}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              <Pencil className="h-4 w-4" />
              Log as No Receipt Entry
            </button>
            <button
              onClick={resetFile}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Try Another Photo
            </button>
          </div>
        </div>
      )}

      {/* Borderline verdict — retry-first banner */}
      {!uploading && failure?.kind === "borderline" && (
        <div className="flex flex-col gap-3 rounded-xl border border-info bg-info-lightest p-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Photo needs a retake
            </p>
            <p className="mt-0.5 text-xs text-text-muted">{failure.message}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={resetFile}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Another Photo
            </button>
            <button
              onClick={onNoReceipt}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Log as No Receipt Entry
            </button>
          </div>
        </div>
      )}

      {/* Manual-entry fallback after 3 failed parse attempts */}
      {!uploading && failedAttempts >= MAX_ATTEMPTS && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning bg-warning-lightest p-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              We couldn&apos;t read this receipt
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              After {MAX_ATTEMPTS} attempts the receipt couldn&apos;t be parsed. You can try
              another photo or enter the entry manually.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onExhausted}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              <Pencil className="h-4 w-4" />
              Enter Entry Manually
            </button>
            <button
              onClick={resetFile}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Try Another Photo
            </button>
          </div>
        </div>
      )}

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
