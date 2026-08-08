// One-shot layout check: signatories must wrap at 3 per row.
// Usage: node scripts/check-signatory-wrap.mjs <reportId> <accessToken>
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pathToFileURL } from "node:url";

GlobalWorkerOptions.workerSrc = new URL(
  "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).href;

const [, , reportId, token] = process.argv;
const res = await fetch(`http://localhost:3000/api/reports/${reportId}/pdf`, {
  headers: { cookie: `insforge_access_token=${token}` },
});
if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
const data = await res.arrayBuffer();

const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const { items } = await page.getTextContent();

// Find the signatory names by their unique trailing tokens.
const wanted = new Set(["One", "Two", "Three", "Four", "Five"]);
const found = [];
for (const it of items) {
  const str = it.str.trim();
  const word = str.split(/\s+/).at(-1);
  if (str && wanted.has(word)) {
    // x = transform[4], y = transform[5] (PDF space, y grows upward)
    found.push({ str, x: it.transform[4], y: it.transform[5] });
  }
}

// Group by row (same y within 3pt tolerance).
const rows = [];
for (const f of found) {
  const row = rows.find((r) => Math.abs(r.y - f.y) < 3);
  if (row) row.names.push(f);
  else rows.push({ y: f.y, names: [f] });
}
rows.sort((a, b) => b.y - a.y); // top row first

console.log("rows:", JSON.stringify(rows, null, 2));
const overflow = rows.some((r) => r.names.length > 3);
if (overflow) throw new Error("FAIL: a signatory row has more than 3 columns");
const total = found.length;
if (total < 5) throw new Error(`FAIL: expected 5 signatories, found ${total}`);
if (rows.length < 2) throw new Error("FAIL: 5 signatories did not wrap to a second row");
console.log("PASS: 5 signatories wrapped —", rows.map((r) => `${r.names.length}/row`).join(" + "));
