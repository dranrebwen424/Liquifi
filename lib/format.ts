const formatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as ₱X,XXX.XX — never rounds or truncates for display. */
export function formatPHP(amount: number): string {
  return formatter.format(amount);
}

/**
 * Format a raw numeric string (digits + optional dot) into a display string
 * with thousands separators. Used for live currency input formatting.
 *
 * "20000" → "20,000"
 * "20000.5" → "20,000.50"
 * "" → ""
 */
export function formatNumberInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) parts.pop();
  if (parts[0]) {
    parts[0] = parseInt(parts[0], 10).toLocaleString("en-US");
  }
  return parts.length > 1
    ? `${parts[0]}.${parts[1].slice(0, 2)}`
    : parts[0] ?? "";
}
