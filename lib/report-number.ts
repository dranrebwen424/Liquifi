/**
 * Pure FS document-number formatting (Step 20).
 * Counter math is extracted here for testability — the DB read/increment
 * lives in `app/api/reports/generate` (single active treasurer per dept
 * makes read-then-increment safe, per architecture.md).
 */
export function formatFsNumber(code: string, year: number, seq: number): string {
  return `FS-${code}-${year}-${String(seq).padStart(5, "0")}`;
}
