"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Upload,
  Loader2,
  CircleCheckBig,
  CircleX,
  X,
  ShieldAlert,
  Camera,
  Image as ImageIcon,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";
import { CameraViewfinder } from "@/components/entries/CameraViewfinder";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";

// Step 24/25 — Archive Event. The treasurer uploads every page of the fully
// signed report; the server verifies completeness and terminal-archives the
// event. Failure keeps the modal open with per-check reasons so the upload is
// a retryable correction, never a data-loss event.

type CheckResult = { passed: boolean; reason: string };
type ChecksResult = {
  document_number: CheckResult;
  signatures: CheckResult;
  page_count: CheckResult;
};

type ArchiveEventButtonProps = {
  eventId: string;
  canArchive: boolean;
  isArchived: boolean;
  /** Compact mode for Figma mobile layout — matches View Report pill style. */
  compact?: boolean;
};

export function ArchiveEventButton({
  eventId,
  canArchive,
  isArchived,
  compact,
}: ArchiveEventButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canArchive}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          compact
            ? "rounded-[17px] border border-border px-3.5 py-[8px] text-[13px] font-medium text-text-primary hover:bg-surface-secondary"
            : "rounded-lg border px-2.5 py-1.5 text-xs font-medium sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm",
          !compact &&
            (canArchive
              ? "border-error/40 bg-surface text-error hover:bg-error-lightest"
              : "border-border bg-surface text-text-muted"),
        )}
        title={
          isArchived
            ? "This event is archived."
            : canArchive
              ? "Upload the fully signed report and archive this event"
              : "Available once the report is approved."
        }
      >
        <Archive className="h-3 w-3" />
        Archive
      </button>

      <ArchiveEventModal
        open={open}
        onClose={() => setOpen(false)}
        eventId={eventId}
      />
    </>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────

type Phase = "upload" | "uploading" | "result";

type ArchiveEventModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
};

export function ArchiveEventModal({ open, onClose, eventId }: ArchiveEventModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);

  const [phase, setPhase] = useState<Phase>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [checks, setChecks] = useState<ChecksResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Reset on open.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the modal intentionally resets its local machine
      setPhase("upload");
      setFiles([]);
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current = [];
      setPreviews([]);
      setChecks(null);
      setSummary(null);
      setError(null);
      setBusy(false);
      setShowCamera(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current = [];
    };
  }, []);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape unless busy.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  /** Validate + append a page — shared by the library input and the camera shutter. */
  const appendPage = useCallback((file: File) => {
    const lowerName = file.name.toLowerCase();
    if (file.type.includes("heic") || lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
      setError("HEIC isn't supported. Use JPG, PNG, or WEBP.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Upload signed pages as images.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Each page must be 10 MB or smaller.");
      return;
    }
    const preview = URL.createObjectURL(file);
    previewUrls.current.push(preview);
    setFiles((prev) => [...prev, file]);
    setPreviews((prev) => [...prev, preview]);
    setError(null);
  }, []);

  const removePage = (index: number) => {
    const url = previews[index];
    if (url) {
      URL.revokeObjectURL(url);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    for (const file of Array.from(list)) appendPage(file);
  };

  const handleLibrarySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Allow re-picking the same file (e.g. retake a page) — input value must reset.
    e.target.value = "";
  };

  /** Camera shutter → same validate + append path as the library picker. */
  const handleCameraCapture = useCallback(
    (file: File) => {
      setShowCamera(false);
      appendPage(file);
    },
    [appendPage],
  );

  const submit = async () => {
    if (files.length === 0) {
      setError("Upload at least one signed page.");
      return;
    }
    setBusy(true);
    setPhase("uploading");
    setError(null);

    const formData = new FormData();
    for (const file of files) formData.append("pages", file);

    try {
      const res = await fetch(`/api/events/${eventId}/archive`, {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        checks?: ChecksResult;
        summary?: string;
      };

      if (res.ok && body.success) {
        router.refresh();
        onClose();
        return;
      }

      if (body.checks) {
        setChecks(body.checks);
        setSummary(body.summary ?? null);
        setPhase("result");
      } else {
        setError(body.error ?? "Something went wrong. Please try again.");
        setPhase("upload");
      }
    } catch {
      setError("Network error. Please try again.");
      setPhase("upload");
    } finally {
      setBusy(false);
    }
  };

  const resetToUpload = () => {
    setFiles([]);
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current = [];
    setPreviews([]);
    setChecks(null);
    setSummary(null);
    setError(null);
    setPhase("upload");
  };

  const uploadContent = () => (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-light text-accent">
            <Archive className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Close event
            </p>
            <h2 className="text-lg font-semibold text-text-primary">Archive event</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Upload all signed report pages.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-3 rounded-2xl border border-warning bg-warning-lightest p-3.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-semibold text-warning-foreground">Final check before archiving</p>
          <ul className="mt-1 space-y-1 text-xs text-text-secondary">
            <li>• Document number must match</li>
            <li>• Each signatory must be signed</li>
            <li>• Page count must match</li>
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="hidden min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface px-4 py-6 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:bg-accent-muted hover:text-text-primary disabled:opacity-50 md:flex"
      >
        <Upload className="h-6 w-6" />
        {files.length > 0 ? `Add more pages (${files.length})` : "Select signed pages"}
        <span className="text-xs font-normal text-text-muted">Multiple images, in page order</span>
      </button>

      <div className="grid grid-cols-2 gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Take photo
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-secondary disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
          Library
        </button>
      </div>
      <p className="text-center text-xs text-text-muted md:hidden">Add pages in order.</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleLibrarySelect}
      />

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[index]}
                alt={`Signed page ${index + 1}`}
                className="h-full w-full object-contain"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-primary shadow-card">
                Page {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removePage(index)}
                disabled={busy}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-text-muted shadow-card transition-colors hover:text-error disabled:opacity-50"
                aria-label={`Remove page ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-error bg-error-lightest px-3 py-2 text-sm font-medium text-error-foreground" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy || files.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
      >
        <FileCheck2 className="h-4 w-4" />
        Upload &amp; verify
      </button>
    </div>
  );

  const uploadingContent = () => (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
      </span>
      <p className="text-sm font-medium text-text-primary">
        Verifying signed report…
      </p>
      <p className="text-xs text-text-muted">
        Checking document number, signatures, and page count
      </p>
    </div>
  );

  const resultContent = () => {
    const allPassed = checks
      ? Object.values(checks).every((c) => c.passed)
      : false;
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              allPassed ? "bg-success-lightest text-success" : "bg-error-lightest text-error",
            )}>
              {allPassed ? <CircleCheckBig className="h-5 w-5" /> : <CircleX className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Verification
              </p>
            <h2 className="text-lg font-semibold text-text-primary">
              {allPassed ? "Verification passed" : "Verification failed"}
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              {allPassed
                ? "The signed report matches the generated report."
                : "Fix the issues below and try again."}
            </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Per-check results */}
        {checks && (
          <div className="space-y-2.5">
            {[
              { key: "document_number", label: "Document number" },
              { key: "signatures", label: "Signatory signatures" },
              { key: "page_count", label: "Page count" },
            ].map(({ key, label }) => {
              const check = checks[key as keyof ChecksResult];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5",
                    check.passed
                      ? "border-success/40 bg-success-lightest"
                      : "border-error/30 bg-error-lightest",
                  )}
                >
                  {check.passed ? (
                    <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                  )}
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        check.passed ? "text-success-foreground" : "text-error-foreground",
                      )}
                    >
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {check.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {summary && <p className="text-xs italic text-text-muted">{summary}</p>}

        {allPassed ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Done
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={resetToUpload}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
          {/* Overlay */}
          <motion.div
            key="archive-overlay"
            variants={dialogOverlay}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-50 bg-overlay-alpha"
            onClick={() => { if (!busy) onClose(); }}
          />

          {/* Web: centered modal */}
          <motion.div
            key="archive-modal"
            variants={dialogContent}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 hidden overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center"
          >
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-7">
              {phase === "upload" && uploadContent()}
              {phase === "uploading" && uploadingContent()}
              {phase === "result" && resultContent()}
            </div>
          </motion.div>

          </>
        )}
      </AnimatePresence>

      <CssBottomSheet open={open} onClose={() => { if (!busy) onClose(); }}>
        <div className="flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-card">
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
          <div className="min-h-0 overflow-y-auto px-5 pb-4 pt-5 sm:px-6">
            {phase === "upload" && uploadContent()}
            {phase === "uploading" && uploadingContent()}
            {phase === "result" && resultContent()}
          </div>
          {phase === "upload" && !busy && (
            <div className="shrink-0 border-t border-border px-6 py-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </CssBottomSheet>

    {/* Full-screen camera — portaled to document.body so it sits above the sheet shell */}
    {showCamera && (
      <CameraViewfinder
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        onUseLibrary={() => {
          setShowCamera(false);
          inputRef.current?.click();
        }}
      />
    )}
    </>
  );
}
