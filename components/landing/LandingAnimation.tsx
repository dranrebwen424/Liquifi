"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import type { AnimationItem } from "lottie-web";
import styles from "@/components/landing/landing.module.css";

type Props = { src: string; poster?: string; label: string; controls?: boolean };

export function LandingAnimation({ src, poster, label, controls = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const visibleRef = useRef(false);
  const userPausedRef = useRef<boolean | null>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    visibleRef.current = false;
    let loading = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = (): void => {
      const animation = animationRef.current;
      if (!animation) return;
      const shouldPause = userPausedRef.current ?? preference.matches;
      setPaused(shouldPause);
      if (shouldPause || !visibleRef.current || document.hidden) animation.pause();
      else animation.play();
    };
    const load = async (): Promise<void> => {
      if (loading || animationRef.current) return;
      loading = true;
      try {
        const lottie = (await import("lottie-web")).default;
        if (cancelled) return;
        const animation = lottie.loadAnimation({ container, renderer: "svg", loop: true, autoplay: false, path: src });
        animationRef.current = animation;
        animation.addEventListener("DOMLoaded", () => { if (!cancelled) { setReady(true); syncPlayback(); } });
        const fail = (): void => {
          if (!cancelled) { setReady(false); setFailed(true); animation.destroy(); animationRef.current = null; }
        };
        animation.addEventListener("data_failed", fail);
        animation.addEventListener("error", fail);
      } catch (error) {
        console.error("[LandingAnimation] Unable to load animation", error);
        if (!cancelled) setFailed(true);
      }
    };
    const observer = new IntersectionObserver((entries) => {
      visibleRef.current = entries.some((entry) => entry.isIntersecting);
      if (visibleRef.current) void load();
      syncPlayback();
    });
    observer.observe(container);
    preference.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      cancelled = true;
      visibleRef.current = false;
      observer.disconnect();
      preference.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [src]);

  const toggle = (): void => {
    const animation = animationRef.current;
    if (!animation) return;
    const next = !paused;
    userPausedRef.current = next;
    setPaused(next);
    if (next || !visibleRef.current || document.hidden) animation.pause();
    else animation.play();
  };

  return (
    <div className={styles.animation} role="group" aria-label={label} data-ready={ready}>
      {poster && <Image className={styles.animationPoster} src={poster} alt="" fill sizes="(max-width: 767px) 300px, 444px" />}
      {failed && !poster && <p className={styles.animationError} role="status">Couldn&apos;t load the walkthrough. Refresh to try again.</p>}
      <div ref={containerRef} className={styles.animationCanvas} aria-hidden="true" />
      {controls && <button type="button" className={styles.playbackButton} disabled={!ready} onClick={toggle} aria-label={paused ? "Play walkthrough" : "Pause walkthrough"} aria-pressed={paused}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>}
    </div>
  );
}
