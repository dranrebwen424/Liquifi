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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dialogOverlay, dialogContent, sheetSlideUp } from "@/lib/motion-variants";
import { CameraViewfinder } from "@/components/entries/CameraViewfinder";

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
      setPhase("upload");
      setFiles([]);
      setPreviews([]);
      setChecks(null);
      setSummary(null);
      setError(null);
      setBusy(false);
      setShowCamera(false);
    }
  }, [open]);

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
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10 MB).");
      return;
    }
    setFiles((prev) => [...prev, file].slice(0, 20));
    setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    setError(null);
  }, []);

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
    setPreviews([]);
    setChecks(null);
    setSummary(null);
    setError(null);
    setPhase("upload");
  };

  const uploadContent = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Archive event</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Upload the fully signed liquidation report
          </p>
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

      {/* Notice */}
      <div className="flex gap-3 rounded-xl border border-warning bg-warning-lightest p-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-medium text-warning-foreground">
            Upload every page of the fully signed report
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Not just the signature page. The system checks that the document
            number, each signatory&apos;s signature, and the page count all
            match the generated report before archiving.
          </p>
        </div>
      </div>

      {/* File picker */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="hidden w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong px-4 py-8 text-sm text-text-muted transition-colors hover:border-accent hover:bg-accent-muted disabled:opacity-50 md:flex"
      >
        <Upload className="h-6 w-6" />
        Tap to select signed pages
        <span className="text-xs text-text-muted">Multiple images, in page order</span>
      </button>

      {/* Mobile — camera + library pair, same as entry capture */}
      <div className="flex gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <Camera className="h-3.5 w-3.5" />
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Choose from Library
        </button>
      </div>
      <p className="text-center text-xs text-text-muted md:hidden">
        Add each signed page in order — you can take or pick more than one.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleLibrarySelect}
      />

      {/* Selected files */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-surface-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[index]}
                alt={`Signed page ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-surface-inverse/70 px-1 py-0.5 text-center text-[10px] font-medium text-text-inverse">
                Page {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy || files.length === 0}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        Upload &amp; Verify
      </button>
    </div>
  );

  const uploadingContent = () => (
    <div className="flex flex-col items-center gap-4 py-10">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {allPassed ? "Verification passed" : "Verification failed"}
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              {allPassed
                ? "The signed report matches the generated report."
                : "Fix the issues below and try again."}
            </p>
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
          <div className="space-y-2">
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
                    "flex items-start gap-3 rounded-lg border p-3",
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
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card">
              {phase === "upload" && uploadContent()}
              {phase === "uploading" && uploadingContent()}
              {phase === "result" && resultContent()}
            </div>
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            key="archive-sheet"
            variants={sheetSlideUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
          >
            <div className="flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-card">
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
              <div className="min-h-0 overflow-y-auto p-6 pb-4">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Full-screen camera — portaled to document.body so it sits above the sheet shell */}
    {showCamera && (
      <CameraViewfinder
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        onUseLibrary={() => inputRef.current?.click()}
      />
    )}
    </>
  );
}