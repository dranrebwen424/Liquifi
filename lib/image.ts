/** Downscale cap for photos (longest side, px). */
const MAX_DIM = 1600;
/** Images under this size are uploaded as-is — no pointless re-encode. */
const SKIP_IF_SMALL = 1 * 1024 * 1024;

/**
 * Shrink a photo before upload: ≤1600px JPEG q0.8 (~200–400KB vs a multi-MB
 * phone photo). Used by both the receipt-parse path and the manual-entry
 * supporting-photo path so large images don't hang on mobile uploads.
 * ponytail: canvas-only, no library. Any failure returns the original file —
 * downscale is an optimization, never a blocker.
 */
export async function prepareImage(file: File): Promise<File> {
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
