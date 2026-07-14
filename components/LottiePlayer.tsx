"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
};

// ponytail: lottie-web is framework-agnostic (no React peer-dep conflicts with
// React 19). Dynamic import inside useEffect keeps it out of the SSR bundle.
export default function LottiePlayer({
  src,
  className,
  loop = true,
  autoplay = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: { destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const lottie = (await import("lottie-web")).default;
      if (cancelled || !ref.current) return;
      anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop,
        autoplay,
        path: src,
      }) as unknown as { destroy: () => void };
    })();
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [src, loop, autoplay]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
