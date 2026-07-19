"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileImage, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MockParsedReceipt = {
  documentTypeRaw: string;
  documentTypeCategory: string;
  documentNumber: string;
  issueDate: string;
  issueTime: string | null;
  supplierName: string;
  amount: number;
  itemBreakdown: {
    description: string;
    qty: number;
    unitPrice: number;
    lineAmount: number;
  }[];
};

type ReceiptUploadProps = {
  /** Called when the mock parse completes with dummy data. */
  onParsed: (data: MockParsedReceipt) => void;
};

/** Maximum file size in bytes (10 MB). */
const MAX_SIZE = 10 * 1024 * 1024;

/** Accepted MIME types for image upload. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function ReceiptUpload({ onParsed }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const validateAndSet = useCallback((f: File) => {
    setError("");
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Only image files are accepted (JPEG, PNG, WebP).");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("File is too large. Maximum size is 10 MB.");
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
      if (selected) validateAndSet(selected);
    },
    [validateAndSet],
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError("");

    // ponytail: mock — simulate 1s "AI parse" delay
    await new Promise((r) => setTimeout(r, 1000));

    // Mock parsed data — structured as if OpenRouter returned it
    const mock: MockParsedReceipt = {
      documentTypeRaw: "Official Receipt",
      documentTypeCategory: "official_receipt",
      documentNumber: "OR-2026-00421",
      issueDate: "2026-07-15",
      issueTime: "14:30",
      supplierName: "National Book Store Inc.",
      amount: 2845.75,
      itemBreakdown: [
        { description: "Bond Paper (Short) — 10 reams", qty: 10, unitPrice: 185.0, lineAmount: 1850.0 },
        { description: "Ballpen — Box of 50", qty: 2, unitPrice: 250.0, lineAmount: 500.0 },
        { description: "Folder (Long) — 20 pcs", qty: 20, unitPrice: 15.5, lineAmount: 310.0 },
        { description: "Correction Tape — 10 pcs", qty: 10, unitPrice: 18.575, lineAmount: 185.75 },
      ],
    };

    setUploading(false);
    onParsed(mock);
    // Keep the file/preview so the review modal can reference the image if needed
  }, [file, onParsed]);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Upload zone — shown when no file is selected */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
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

          {error && <p className="text-sm text-error">{error}</p>}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
