"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "@/components/landing/landing.module.css";

type Props = { children: ReactNode };

export function WorkflowCarousel({ children }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const updateActive = (): void => {
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!track || !(first instanceof HTMLElement)) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    setActive(Math.max(0, Math.min(2, Math.round(track.scrollLeft / (first.offsetWidth + gap)))));
  };
  return (
    <>
      <div ref={trackRef} className={styles.stepGrid} onScroll={updateActive} tabIndex={0} role="region" aria-label="Three steps from budget to liquidation">{children}</div>
      <div className={styles.carouselDots} aria-label="Choose a workflow step">
        {["Create an Event", "Record & Track Expenses", "Generate & Finalize Reports"].map((label, index) => (
          <button key={label} type="button" aria-label={`Step ${index + 1}: ${label}`} aria-current={active === index ? "step" : undefined} onClick={() => {
            const track = trackRef.current;
            const card = track?.children[index];
            if (track && card instanceof HTMLElement) track.scrollTo({ left: card.offsetLeft - Number.parseFloat(getComputedStyle(track).paddingLeft), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }}><span /></button>
        ))}
      </div>
    </>
  );
}
