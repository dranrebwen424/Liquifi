/**
 * Reconstruct an entry's list of image storage keys from its `image_url`
 * column. Multi-image entries store a JSON array string (`["k0","k1",...]`);
 * single-image entries — including every receipt and older manual entry —
 * store a bare key. A bare key is treated as a one-element list, so both
 * representations read identically downstream.
 *
 * Pure + dependency-free so it can be imported from client components (to
 * count images for the modal grid) and server modules (to resolve blob keys)
 * alike — unlike `lib/storage.ts`, which pulls in the server SDK.
 */
export function parseEntryImageKeys(imageUrl?: string | null): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith("[")) {
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === "string");
    } catch {
      // fall through — treat as a bare single key
    }
  }
  return [imageUrl];
}
