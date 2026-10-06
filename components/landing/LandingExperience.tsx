"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Pause, Play } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "@/components/landing/landing.module.css";

type Props = { children: ReactNode };

export function LandingExperience({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || paused) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        root.dataset.motionReady = "true";

        root.querySelectorAll<HTMLElement>("[data-text-reveal]").forEach((heading) => {
          gsap.from(heading.children, {
            y: 22, opacity: 0, duration: 0.65, stagger: 0.09, ease: "power3.out",
            scrollTrigger: { trigger: heading, start: "top 92%", once: true },
          });
        });

        root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 20, opacity: 0, duration: 0.65, ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          });
        });

        root.querySelectorAll<HTMLElement>("[data-grow]").forEach((element) => {
          gsap.from(element, {
            scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 90%", once: true },
          });
        });

        const cta = root.querySelector<HTMLElement>("[data-final-cta]");
        if (cta) {
          gsap.to(root, {
            backgroundColor: getComputedStyle(root).getPropertyValue("--color-landing-mint").trim(),
            ease: "none",
            scrollTrigger: { trigger: cta, start: "top bottom", end: "top 20%", scrub: 1 },
          });
          gsap.fromTo(cta.querySelectorAll("[data-number-drift]"), { y: 22 }, {
            y: -22, ease: "none", stagger: 0.04,
            scrollTrigger: { trigger: cta, start: "top bottom", end: "bottom top", scrub: 1.5 },
          });
        }

        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.target instanceof HTMLElement) entry.target.dataset.inView = String(entry.isIntersecting);
          });
        }, { threshold: 0.05 });
        root.querySelectorAll("[data-ambient]").forEach((element) => observer.observe(element));

        const syncVisibility = (): void => { root.dataset.documentHidden = String(document.hidden); };
        syncVisibility();
        document.addEventListener("visibilitychange", syncVisibility);

        return () => {
          root.dataset.motionReady = "false";
          observer.disconnect();
          document.removeEventListener("visibilitychange", syncVisibility);
        };
      }, root);

      media.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
        const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-pointer-layer]"), (element) => ({
          element,
          distance: Number(element.dataset.pointerLayer),
          x: gsap.quickTo(element, "x", { duration: 0.8, ease: "power3.out" }),
          y: gsap.quickTo(element, "y", { duration: 0.8, ease: "power3.out" }),
        }));
        const move = (event: PointerEvent): void => {
          const x = event.clientX / window.innerWidth - 0.5;
          const y = event.clientY / window.innerHeight - 0.5;
          layers.forEach((layer) => {
            const rect = layer.element.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            layer.x(x * layer.distance);
            layer.y(y * layer.distance);
          });
        };
        const reset = (): void => { layers.forEach((layer) => { layer.x(0); layer.y(0); }); };
        root.addEventListener("pointermove", move, { passive: true });
        root.addEventListener("pointerleave", reset);
        return () => {
          root.removeEventListener("pointermove", move);
          root.removeEventListener("pointerleave", reset);
        };
      }, root);
    }, root);

    return () => { media.revert(); context.revert(); };
  }, [paused]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    const closeEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && menu.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.page} data-motion-paused={paused}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label="Liquifi home">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="26" height="26" rx="7" stroke="currentColor" strokeWidth="2" />
              <path d="M9 20c2-7 12-7 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="12" r="2.5" fill="currentColor" />
            </svg>
            Liquifi<span className={styles.brandDot}>.</span>
          </Link>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#features">Why Liquifi</a><a href="#how">How it works</a><a href="#questions">FAQs</a>
          </nav>
          <div className={styles.headerActions}>
            <button type="button" className={styles.motionButton} aria-pressed={paused} aria-label={paused ? "Resume animations" : "Pause animations"} onClick={() => setPaused(!paused)} title={paused ? "Resume animations" : "Pause animations"}>
              {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
              <span>{paused ? "Motion off" : "Motion on"}</span>
            </button>
            <Link href="/login" className={styles.headerLogin}>Sign in</Link>
            <Link href="/signup" className={styles.headerCta}>Get started <ArrowUpRight size={15} aria-hidden="true" /></Link>
            <details ref={menuRef} className={styles.mobileMenu}>
              <summary aria-label="Navigation menu"><Menu size={21} aria-hidden="true" /></summary>
              <nav aria-label="Mobile navigation" onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a") && menuRef.current) menuRef.current.open = false;
              }}>
                <a href="#features">Why Liquifi</a><a href="#how">How it works</a><a href="#questions">FAQs</a>
                <Link href="/login">Sign in</Link><Link href="/signup">Get started <ArrowUpRight size={15} aria-hidden="true" /></Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
      <div className={styles.interactiveBackdrop} aria-hidden="true" data-pointer-layer="24" />
      {children}
    </div>
  );
}
