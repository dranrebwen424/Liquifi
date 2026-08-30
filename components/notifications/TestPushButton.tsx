"use client";

import { useState } from "react";

// TEMP diagnostic button — sends a self notification + web push via the real
// production path. Remove after testing.
export function TestPushButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function send() {
    setStatus("sending");
    try {
      const res = await fetch("/api/notifications/test-push", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setStatus(res.ok && json.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={status === "sending"}
      className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-muted disabled:opacity-60"
    >
      {status === "sending"
        ? "Sending…"
        : status === "ok"
          ? "Sent ✓"
          : status === "error"
            ? "Failed — retry"
            : "Send test notification"}
    </button>
  );
}
