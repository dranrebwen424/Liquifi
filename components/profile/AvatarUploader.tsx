"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareImage } from "@/lib/image";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  hasAvatar: boolean;
};

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}

export default function AvatarUploader({ hasAvatar }: Props): ReactElement {
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          <Camera className="h-4 w-4 text-text-secondary" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">Profile image</p>
          <p className="text-xs text-text-secondary">JPG, PNG, or WEBP up to 10MB.</p>
        </div>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-auto"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Please wait…" : hasAvatar ? "Change image" : "Upload image"}
        </Button>
        {(hasAvatar || previewUrl) && (
          <Button
            type="button"
            variant="ghost"
            className="w-auto text-error hover:bg-error-lightest"
            disabled={busy}
            onClick={handleRemove}
          >
            <Trash2 aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={busy}
      />
      {error && (
        <p role="alert" className="text-sm text-error-dark">
          {error}
        </p>
      )}
    </div>
  );
}
