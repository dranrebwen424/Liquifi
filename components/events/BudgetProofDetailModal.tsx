"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CircleCheckBig, CircleX, FileText, X, ZoomIn } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { dialogOverlay, dialogContent } from "@/lib/motion-variants";
import { parseImageKeys } from "@/lib/image-keys";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { StatusBadge, type StatusEntry } from "@/components/ui/StatusBadge";
import type { BudgetProof } from "@/lib/queries/budget-proofs";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Detail row — label + value pair (mirrors EntryDetailModal). */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

const proofStatusMap: Record<string, StatusEntry> = {
  matched: { icon: CircleCheckBig, variant: "success", label: "Verified" },
  mismatch: { icon: CircleX, variant: "warning", label: "Mismatch" },
  pending: { icon: Clock, variant: "neutral", label: "Pending" },
} as const;

/** Proof detail sheet — tap a budget-history card to open. Latches the last
 *  non-null proof so the sheet animates out smoothly (same pattern as
 *  EntryDetailModal). */
export function BudgetProofDetailModal({
  open,
  onClose,
  proof,
}: {
  open: boolean;
  onClose: () => void;
  proof: BudgetProof | null;
}) {
  const [imageOpen, setImageOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const [lastProof, setLastProof] = useState<BudgetProof | null>(proof);
  if (proof && proof !== lastProof) {
    setLastProof(proof);
  }
  const contentProof: BudgetProof | null = proof ?? lastProof;

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!contentProof) return null;

  const imageKeys = parseImageKeys(contentProof.proof_url);
  const imageCount = imageKeys.length;

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            {contentProof.type === "initial"
              ? "Initial Budget"
              : "Budget Increase"}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Submitted on {formatDate(contentProof.uploaded_at)}
          </p>
        </div>
        <StatusBadge
          icon={proofStatusMap[contentProof.verification_status]?.icon ?? Clock}
          variant={proofStatusMap[contentProof.verification_status]?.variant ?? "neutral"}
          label={proofStatusMap[contentProof.verification_status]?.label ?? contentProof.verification_status}
        />
      </div>

      <div className="divide-y divide-border border-y border-border">
        <DetailRow
          label="Claimed amount"
          value={formatPHP(contentProof.claimed_amount)}
        />
        {contentProof.ai_extracted_amount != null && (
          <DetailRow
            label="Amount on document"
            value={formatPHP(contentProof.ai_extracted_amount)}
          />
        )}
        {contentProof.verification_status === "matched" &&
          contentProof.resulting_budget_total != null && (
            <DetailRow
              label="Resulting budget"
              value={formatPHP(contentProof.resulting_budget_total)}
            />
          )}
      </div>

      {/* Proof images — tap any to view full-screen */}
      {imageCount > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">
            Proof{imageCount > 1 ? ` (${imageCount})` : ""}
          </span>
          <div
            className={`grid gap-2 ${imageCount === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {imageKeys.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setImageIndex(i);
                  setImageOpen(true);
                }}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-secondary"
              >
                {/* ponytail: img src is set lazily below via onError chain — a
                    bare <img> tag that 404s the viewer overlay instead. */}
                <img
                  src={`/api/proofs/${contentProof.id}/image?i=${i}`}
                  alt={`Proof image ${i + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-surface opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="h-4 w-4 text-text-muted" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-border bg-surface">
          <FileText className="mb-2 h-10 w-10 text-text-muted/40" />
          <p className="text-xs text-text-muted">No proof image available</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Image viewer */}
      <ImageViewer
        open={imageOpen}
        src={`/api/proofs/${contentProof.id}/image?i=${imageIndex}`}
        index={imageIndex}
        count={imageCount}
        onNavigate={setImageIndex}
        onClose={() => setImageOpen(false)}
      />

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              variants={dialogOverlay}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="fixed inset-0 z-50 bg-overlay-alpha"
              onClick={onClose}
            />

            {/* Desktop modal */}
            <motion.div
              variants={dialogContent}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-50 hidden items-center justify-center p-4 sm:flex"
            >
              <div className="relative max-h-[85dvh] w-full max-w-lg rounded-xl border border-border bg-surface shadow-card">
                <button
                  onClick={onClose}
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-text-muted shadow-sm hover:bg-surface-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="max-h-[85dvh] scrollbar-hide overflow-y-auto rounded-xl p-6 pt-12">
                  {content}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CssBottomSheet open={open} onClose={onClose}>
        <div className="max-h-[85dvh] scrollbar-hide overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-card">
          <div className="mx-auto mb-5 mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="p-6 pb-8 pt-0">{content}</div>
        </div>
      </CssBottomSheet>
    </>
  );
}