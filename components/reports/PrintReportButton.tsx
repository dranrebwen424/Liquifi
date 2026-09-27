"use client";

import { Printer } from "lucide-react";

// The treasurer may print the report only once the adviser has approved it.
// Prints the streamed PDF via a hidden same-origin iframe (the proxy route
// requires a session cookie, so no external window/navigation).

type PrintReportButtonProps = {
  pdfUrl: string;
  inverse?: boolean;
};

export function PrintReportButton({ pdfUrl, inverse = false }: PrintReportButtonProps) {
  const handlePrint = () => {
    const frame = document.createElement("iframe");
    frame.src = pdfUrl;
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
      setTimeout(() => frame.remove(), 60_000);
    };
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${inverse ? "border border-text-inverse/30 text-text-inverse hover:bg-text-inverse/10 focus-visible:outline-text-inverse" : "bg-accent text-accent-foreground hover:bg-accent-hover focus-visible:outline-accent"}`}
    >
      <Printer className="h-3.5 w-3.5" />
      Print Report
    </button>
  );
}
