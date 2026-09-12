"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

/** Full-screen image viewer. Supports paging through multiple images via
 *  `index`/`count` — when count > 1, arrow buttons + arrow keys cycle
 *  through them. Shared by entries and budget proofs. */
export function ImageViewer({
  open,
  src,
  index,
  count,
  onNavigate,
  onClose,
}: {
  open: boolean;
  src?: string;
  index: number;
  count: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) onNavigate((index - 1 + count) % count);
      else if (e.key === "ArrowRight" && count > 1) onNavigate((index + 1) % count);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onNavigate, index, count]);

  // Reset error state when a new image is shown
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src, open]);

  const arrowBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/35 disabled:opacity-30";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          {count > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate((index - 1 + count) % count);
                }}
                disabled={count <= 1}
                className={`absolute left-3 ${arrowBtn}`}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate((index + 1) % count);
                }}
                disabled={count <= 1}
                className={`absolute right-3 ${arrowBtn}`}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                {index + 1} / {count}
              </span>
            </>
          )}
          {src && !failed ? (
            <img
              src={src}
              alt="Supporting image"
              onError={() => setFailed(true)}
              className="max-h-[80vh] w-auto max-w-[90vw] rounded-xl object-contain"
            />
          ) : (
            /* Placeholder — when no image is available */
            <div className="flex h-[70vh] w-[80vw] max-w-2xl flex-col items-center justify-center rounded-xl bg-white p-8">
              <FileText className="mb-4 h-20 w-20 text-text-muted/30" />
              <p className="text-sm text-text-muted">Supporting image preview</p>
              <p className="mt-1 text-xs text-text-muted">
                No image available for this entry
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}