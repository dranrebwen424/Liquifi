"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { prepareImage } from "@/lib/image";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  avatarUrl: string | null;
  initials: string;
  hasAvatar: boolean;
};

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}

export default function AvatarUploader({ avatarUrl, initials, hasAvatar }: Props): ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function setPreview(file: File | null): void {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(previewRef.current);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("Upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Image is too large (max 10MB).");
      return;
    }

    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      setPreview(prepared);
      const form = new FormData();
      form.append("image", prepared);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(errorMessage(data, "We couldn't upload your image. Please try again."));
      }
      router.refresh();
    } catch (uploadError) {
      setPreview(null);
      setError(
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : "We couldn't upload your image. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(errorMessage(data, "We couldn't remove your image. Please try again."));
      }
      setPreview(null);
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error && removeError.message
          ? removeError.message
          : "We couldn't remove your image. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const imageUrl = previewUrl ?? avatarUrl;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-border text-3xl font-semibold text-text-secondary shadow-sm">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
        <button
          type="button"
          aria-label="Edit profile image"
          title="Edit profile image"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-primary shadow-sm transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={busy}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 max-w-xs text-center text-sm text-error-dark">
          {error}
        </p>
      )}
      {hasAvatar && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          className="mt-2 text-xs text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
