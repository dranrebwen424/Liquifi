"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";

// Renders PDF pages to <canvas> so no browser PDF-viewer toolbar appears —
// an <iframe>/<embed> always shows the browser's native toolbar, which cannot
// be hidden. The proxy URL is same-origin, so the fetch carries session
// cookies automatically.
//
// NOTE: pdfjs-dist is imported lazily inside the effect (not at module scope)
// because client components are also evaluated server-side during SSR, and
// pdfjs-dist references `DOMMatrix` at module scope — which doesn't exist in
// Node. A static import would crash every SSR of this page.
const WORKER_SRC = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfViewerProps = {
  url: string;
  /** Scroll container box — matches the old iframe's `h-[70vh]` sizing. */
  className?: string;
};

export function PdfViewer({ url, className = "h-[70vh]" }: PdfViewerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const box = boxRef.current;
    const mount = mountRef.current;
    if (!box || !mount) return;

    let cancelled = false;
    const renderTasks: RenderTask[] = [];
    let loadingTask: PDFDocumentLoadingTask | null = null;

    (async () => {
      try {
        const { getDocument, GlobalWorkerOptions, OutputScale } = await import(
          "pdfjs-dist"
        );
        GlobalWorkerOptions.workerSrc = WORKER_SRC;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
        const data = await res.arrayBuffer();

        loadingTask = getDocument({ data });
        const doc = await loadingTask.promise;

        // Fit page width to the container (capped so wide monitors don't get
        // enormous canvases), then OutputScale doubles it for DPR crispness.
        const fitWidth = Math.min(800, box.clientWidth - 40);
        const probe = await doc.getPage(1);
        const scale = Math.min(1.5, fitWidth / probe.getViewport({ scale: 1 }).width);
        probe.cleanup();

        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const outputScale = new OutputScale();
          const viewport = page.getViewport({ scale });
          const scaled = page.getViewport({ scale: scale * outputScale.sx });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(scaled.width);
          canvas.height = Math.floor(scaled.height);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className =
            "mx-auto my-3 block rounded-lg border border-border bg-white shadow-sm";
          canvas.setAttribute("aria-label", `Report page ${n}`);
          mount.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas 2D context unavailable");
          const task = page.render({
            canvas,
            canvasContext: ctx,
            viewport: scaled,
            ...(outputScale.scaled
              ? { transform: [outputScale.sx, 0, 0, outputScale.sy, 0, 0] }
              : {}),
          });
          renderTasks.push(task);
          await task.promise;
          page.cleanup();
        }

        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[PdfViewer]", err);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel());
      loadingTask?.destroy();
      mount.replaceChildren();
    };
  }, [url]);

  if (status === "error") {
    return (
      <div
        className={`${className} flex w-full items-center justify-center rounded-xl border border-border bg-surface`}
      >
        <p className="text-sm text-text-muted">Couldn&apos;t load the report PDF.</p>
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className={`${className} w-full overflow-auto rounded-xl border border-border bg-surface-secondary/50 p-4`}
    >
      <div ref={mountRef} />
      {status === "loading" && (
        <div className="flex h-full min-h-40 items-center justify-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report…
        </div>
      )}
    </div>
  );
}
