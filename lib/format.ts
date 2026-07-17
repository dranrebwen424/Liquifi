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
