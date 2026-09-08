"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { insforge } from "@/lib/insforge-client";

/**
 * Live cross-device refresh for the event dashboard. Subscribes to the
 * event's realtime channel (fed by DB triggers on `entries`/`reports`) and
 * calls router.refresh() when something changed — so a receipt logged or a
 * report approved on ANOTHER device appears here within ~1s instead of
 * waiting out the staleTimes window. Renders nothing.
 *
 * ponytail: global 2s throttle — a burst of N mutations triggers 1 refresh.
 * Channel payload is empty on purpose: channels are readable by the anon key,
 * so we never broadcast entry/report data, only "something changed".
 * Refresh is just a re-fetch of the RSC payload — all data still comes from
 * the authenticated server query with RLS.
 */
export function EventLiveRefresh({ eventId }: { eventId: string }) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const silentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silentFired = useRef(false);

  useEffect(() => {
    let subscribed = false;
    let disposed = false;

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh.current < 2000) return;
      lastRefresh.current = now;
      router.refresh();
    };

    // One silent refresh shortly after mount: if this page was served from
    // the ~5min prefetch snapshot it may be stale, so re-fetch the RSC once
    // in place (no skeleton, client state + scroll preserved) and let
    // realtime stay authoritative afterwards. Fires once — the ref guard plus
    // router.refresh() not remounting this component prevents a loop. The 2s
    // throttle merges it with any near-simultaneous realtime refresh.
    if (!silentFired.current) {
      silentFired.current = true;
      silentTimer.current = setTimeout(refresh, 500);
    }

    insforge.realtime.on("changed", refresh);

    insforge.realtime
      .connect()
      .then(async () => {
        if (disposed) return;
        const res = await insforge.realtime.subscribe(`event:${eventId}`);
        if (disposed) {
          if (res.ok) await insforge.realtime.unsubscribe(`event:${eventId}`);
          return;
        }
        subscribed = res.ok;
        if (!res.ok) console.error("[realtime] subscribe failed", res.error?.message);
      })
      .catch((err) => {
        if (!disposed) console.error("[realtime] connect failed", err);
      });

    return () => {
      disposed = true;
      if (silentTimer.current) clearTimeout(silentTimer.current);
      insforge.realtime.off("changed", refresh);
      if (subscribed) insforge.realtime.unsubscribe(`event:${eventId}`);
      insforge.realtime.disconnect();
    };
  }, [eventId, router]);

  return null;
}
