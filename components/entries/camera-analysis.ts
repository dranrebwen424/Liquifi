/**
 * Real-time receipt-photo quality analysis for the camera viewfinder.
 * Pure functions over a downscaled grayscale frame — no ML, no deps.
 * Guidance only: results never block capture.
 */

export type FrameMetrics = {
  /** Mean grayscale luminance, 0..255. */
  luminance: number;
  /** Variance of the 3×3 Laplacian response — low = blurry (focus or motion). */
  sharpness: number;
  /** Fraction of pixels whose Laplacian magnitude exceeds the edge threshold. */
  edgeCoverage: number;
  /** Bounding box of strong-edge pixels (fractions of frame), null when none. */
  edgeBounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
};

export type QualityHint =
  | { kind: "dim"; torch: boolean } // torch=true → "enable flash" suggestion
  | { kind: "close" }
  | { kind: "far" }
  | { kind: "blur" };

const SAMPLE_W = 96;
const SAMPLE_H = 128;

// ponytail: thresholds calibrated against synthetic patterns in the verification
// harness (good/dark/blurry/far/close). Real-device tuning is a manual QA knob.
const DIM_LUMINANCE = 60;
const BLUR_SHARPNESS = 250;
const CLOSE_EDGE_COVERAGE = 0.45;
const FAR_MAX_COVERAGE = 0.06;
const FAR_MIN_SHARPNESS = 400; // must be in-focus to read as "far", not "blur"
const FAR_MAX_BBOX_AREA = 0.25;
const EDGE_THRESHOLD = 48;

/** Lazy singleton — only ever touched from analyzeFrame, which runs client-side. */
let sampleCanvas: HTMLCanvasElement | null = null;

export function analyzeFrame(video: HTMLVideoElement): FrameMetrics {
  if (!sampleCanvas) sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = SAMPLE_W;
  sampleCanvas.height = SAMPLE_H;
  const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { luminance: 0, sharpness: 0, edgeCoverage: 0, edgeBounds: null };
  ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
  const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

  // Grayscale + mean luminance
  const g = new Uint8Array(SAMPLE_W * SAMPLE_H);
  let luminance = 0;
  for (let i = 0, p = 0; i < g.length; i++, p += 4) {
    const y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    g[i] = y;
    luminance += y;
  }
  luminance /= g.length;

  // Laplacian magnitude over interior pixels
  let sum = 0;
  let sumSq = 0;
  let edges = 0;
  let minX = SAMPLE_W;
  let maxX = 0;
  let minY = SAMPLE_H;
  let maxY = 0;
  for (let y = 1; y < SAMPLE_H - 1; y++) {
    for (let x = 1; x < SAMPLE_W - 1; x++) {
      const i = y * SAMPLE_W + x;
      const lap = Math.abs(4 * g[i] - g[i - 1] - g[i + 1] - g[i - SAMPLE_W] - g[i + SAMPLE_W]);
      sum += lap;
      sumSq += lap * lap;
      if (lap > EDGE_THRESHOLD) {
        edges++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const interior = (SAMPLE_W - 2) * (SAMPLE_H - 2);
  const mean = sum / interior;
  const sharpness = sumSq / interior - mean * mean;
  const edgeCoverage = edges / interior;
  const edgeBounds =
    edges > 0
      ? {
          minX: minX / SAMPLE_W,
          maxX: (maxX + 1) / SAMPLE_W,
          minY: minY / SAMPLE_H,
          maxY: (maxY + 1) / SAMPLE_H,
        }
      : null;

  return { luminance, sharpness, edgeCoverage, edgeBounds };
}

/**
 * Classify metrics into the first (highest-priority) failing condition.
 * Priority: dim → close → far → blur. Blur is checked last because a dark
 * frame reads as low Laplacian variance (false "blur"), and an in-focus but
 * tiny receipt reads as high sharpness (so "far" fires before "blur").
 */
export function interpret(
  metrics: FrameMetrics,
  opts: { torchSupported: boolean; flashOn: boolean },
): QualityHint | null {
  if (metrics.luminance < DIM_LUMINANCE) {
    return { kind: "dim", torch: opts.torchSupported && !opts.flashOn };
  }
  if (metrics.edgeCoverage > CLOSE_EDGE_COVERAGE) return { kind: "close" };
  if (
    metrics.sharpness > FAR_MIN_SHARPNESS &&
    metrics.edgeCoverage < FAR_MAX_COVERAGE &&
    metrics.edgeBounds !== null &&
    (metrics.edgeBounds.maxX - metrics.edgeBounds.minX) *
      (metrics.edgeBounds.maxY - metrics.edgeBounds.minY) <
      FAR_MAX_BBOX_AREA
  ) {
    return { kind: "far" };
  }
  if (metrics.sharpness < BLUR_SHARPNESS) return { kind: "blur" };
  return null;
}
