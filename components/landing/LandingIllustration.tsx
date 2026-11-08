"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Props = { src: string; width: number; height: number; className: string };

export function LandingIllustration({ src, width, height, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let visible = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => { setAnimating(visible && !preference.matches && !document.hidden); };
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    observer.observe(element);
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <span ref={ref} className={className}><Image src={animating ? src : src.replace(/\.webp$/, "-still.webp")} width={width} height={height} alt="" loading="lazy" unoptimized onError={() => setAnimating(false)} /></span>;
}
