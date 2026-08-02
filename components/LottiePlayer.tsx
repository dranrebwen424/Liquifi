"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  onComplete?: () => void;
};

// ponytail: lottie-web is framework-agnostic (no React peer-dep conflicts with
// React 19). Dynamic import inside useEffect keeps it out of the SSR bundle.
export default function LottiePlayer({
  src,
  className,
  loop = true,
  autoplay = true,
  onComplete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // ponytail: lottie-web types are loose; use any for event listener methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let anim: any = null;
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
      });

      if (!loop && onCompleteRef.current) {
        const handler = () => onCompleteRef.current?.();
        anim.addEventListener("complete", handler);
        anim.__liquifiHandler = handler;
      }
    })();
    return () => {
      cancelled = true;
      if (anim) {
        if (anim.__liquifiHandler) {
          anim.removeEventListener("complete", anim.__liquifiHandler);
        }
        anim.destroy();
      }
    };
  }, [src, loop, autoplay]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
