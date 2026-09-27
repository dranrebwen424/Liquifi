"use client";

import { useState } from "react";
import { ImageViewer } from "@/components/ui/ImageViewer";

type Props = {
  reportId: string;
  pageCount: number;
};

/**
 * The physically signed report pages uploaded at archive time, served through
 * the session-authed `/api/reports/{id}/signed-page` proxy. Tap a page to open
 * the shared full-screen viewer.
 */
export function SignedReportPages({ reportId, pageCount }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const srcFor = (index: number) => `/api/reports/${reportId}/signed-page?i=${index}`;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: pageCount }, (_, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="block w-full cursor-zoom-in rounded-xl border border-border bg-surface p-2 shadow-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <img
                src={srcFor(index)}
                alt={`Signed report page ${index + 1} of ${pageCount}`}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full rounded-lg object-contain"
              />
              <p className="mt-2 text-center text-[11px] text-text-muted">
                Page {index + 1} of {pageCount}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <ImageViewer
          open
          src={srcFor(openIndex)}
          index={openIndex}
          count={pageCount}
          onNavigate={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
