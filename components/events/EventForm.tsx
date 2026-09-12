"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, ImagePlus, X } from "lucide-react";
import { CameraViewfinder } from "@/components/entries/CameraViewfinder";
import { FloatingInput } from "@/components/entries/FloatingInput";

const MAX_PROOFS = 5;
const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ACCEPTED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type EventSubmitResult = {
  success: boolean;
  /** Fatal error when success=false. (Proofs are required — failure is fatal.) */
  message?: string;
};

type EventFormProps = {
  /** Called on submit. Defaults to mock behavior if omitted. */
  onSubmit?: (name: string, budgetTotal: number, proofFiles: File[]) => Promise<EventSubmitResult>;
};

export function EventForm({ onSubmit }: EventFormProps) {
  const [name, setName] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current = [];
    };
  }, []);

  function removeProof(index: number): void {
    const url = proofPreviews[index];
    if (url) {
      URL.revokeObjectURL(url);
    }
    setProofFiles((prev) => prev.filter((_, i) => i !== index));
    setProofPreviews((prev) => prev.filter((_, i) => i !== index));
    setError("");
  }

  function addProofs(picked: File[]): void {
    if (picked.length === 0) return;

    const nextFiles = [...proofFiles];
    const nextPreviews = [...proofPreviews];
    let nextError = "";

    for (const file of picked) {
      const lowerName = file.name.toLowerCase();
      if (nextFiles.length >= MAX_PROOFS) {
        nextError = `Up to ${MAX_PROOFS} photos only.`;
        break;
      }
      if (file.type.includes("heic") || lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
        nextError = "HEIC isn't supported. Use JPG, PNG, or WEBP.";
        continue;
      }
      if (!ACCEPTED_PROOF_TYPES.has(file.type)) {
        nextError = "Upload JPG, PNG, or WEBP.";
        continue;
      }
      if (file.size > MAX_PROOF_BYTES) {
        nextError = "Each photo must be 10 MB or smaller.";
        continue;
      }

      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      nextFiles.push(file);
      nextPreviews.push(preview);
    }

    setProofFiles(nextFiles);
    setProofPreviews(nextPreviews);
    setError(nextError);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError("");

    const nameTrimmed = name.trim();
    const parsed = parseFloat(budgetTotal.replace(/,/g, ""));

    if (!nameTrimmed) {
      setError("Event name is required.");
      return;
    }
    if (!budgetTotal || isNaN(parsed) || parsed <= 0) {
      setError("Budget must be a positive amount.");
      return;
    }
    if (proofFiles.length === 0) {
      setError("Budget proof is required.");
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        const result = await onSubmit(nameTrimmed, parsed, proofFiles);
        if (!result.success) {
          setError(result.message ?? "Failed to create event.");
        }
      } else {
        // ponytail: mock — simulate success
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch {
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-3">
          <FloatingInput
            label="Event name"
            value={name}
            onChange={(value) => setName(String(value))}
            required
          />
          <FloatingInput
            label="Total budget"
            value={budgetTotal}
            onChange={(value) => setBudgetTotal(String(value))}
            inputMode="decimal"
            prefix="₱"
            currency
            required
          />
          <p className="text-xs text-text-muted">
            You can increase this later with a verified proof.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Budget proof</p>
            <p className="text-xs text-text-muted">Funding letter or approved budget document.</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              addProofs(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="hidden min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface px-4 py-6 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:bg-accent-muted hover:text-text-primary md:flex"
          >
            <ImagePlus className="h-6 w-6 text-text-muted" />
            {proofFiles.length > 0 ? `Add more proof photos (${proofFiles.length}/${MAX_PROOFS})` : "Add proof photos"}
            <span className="text-xs font-normal text-text-muted">JPG, PNG, or WEBP · up to 5 photos</span>
          </button>

          <div className="grid grid-cols-2 gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              Take photo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-secondary"
            >
              <ImageIcon className="h-4 w-4" />
              Library
            </button>
          </div>

          {proofFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {proofFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-secondary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreviews[index]}
                    alt={`Budget proof ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-primary shadow-card">
                    Proof {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProof(index)}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-text-muted shadow-card transition-colors hover:text-error"
                    aria-label={`Remove proof ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-error bg-error-lightest px-3 py-2 text-sm font-medium text-error-foreground" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-[color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create event"}
        </button>
      </form>

      {showCamera && (
        <CameraViewfinder
          onCapture={(file) => {
            setShowCamera(false);
            addProofs([file]);
          }}
          onClose={() => setShowCamera(false)}
          onUseLibrary={() => {
            setShowCamera(false);
            fileRef.current?.click();
          }}
        />
      )}
    </>
  );
}
