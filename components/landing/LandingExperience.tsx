"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { useAutoHideTopBar } from "@/hooks/useAutoHideTopBar";
import styles from "@/components/landing/landing.module.css";

type Props = { children: ReactNode };

const LINKS = [{ id: "home", label: "Home" }, { id: "features", label: "Features" }, { id: "how-it-works", label: "How it Works" }];

export function LandingExperience({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingSection = useRef<string | null>(null);
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerVisible = useAutoHideTopBar();

  useEffect(() => {
    const sections = LINKS.map(({ id }) => document.getElementById(id));
    const updateActive = (): void => {
      const current = sections.filter((section) => section && section.getBoundingClientRect().top <= window.innerHeight * 0.35).at(-1);
      if (current) setActive(current.id);
    };
    const observer = new IntersectionObserver(updateActive, { rootMargin: "-10% 0px -65% 0px", threshold: 0 });
    sections.forEach((section) => { if (section) observer.observe(section); });
    window.addEventListener("hashchange", updateActive);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", updateActive);
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (): void => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<HTMLElement, Animation>();
    let observer: IntersectionObserver | null = null;
    const start = (): void => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (preference.matches) return;
      elements.forEach((element) => {
        if (element.dataset.landingRevealed) return;
        const transform = element.dataset.landingReveal === "left" ? "translateX(-20px)" : element.dataset.landingReveal === "right" ? "translateX(20px)" : "translateY(16px)";
        const animation = element.animate([{ opacity: 0, transform }, { opacity: 1, transform: "none" }], {
          duration: 700, delay: Number(element.dataset.revealOrder ?? 0) * 100, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "both",
        });
        animation.pause();
        animation.currentTime = 0;
        animations.set(element, animation);
        animation.onfinish = (): void => { animation.cancel(); animations.delete(element); };
      });
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const element = entry.target;
          if (!entry.isIntersecting || !(element instanceof HTMLElement) || element.dataset.landingRevealed) return;
          observer?.unobserve(element);
          element.dataset.landingRevealed = "true";
          animations.get(element)?.play();
        });
      }, { threshold: 0.01 });
      elements.forEach((element) => { if (!element.dataset.landingRevealed) observer?.observe(element); });
    };
    start();
    preference.addEventListener("change", start);
    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", start);
    };
  }, []);

  const scrollToSection = (id: string): void => {
    const target = document.getElementById(id);
    if (!target) return;
    if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: id === "main-content" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    if (LINKS.some((link) => link.id === id)) setActive(id);
  };

  const navigate = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
    const id = anchor?.getAttribute("href")?.slice(1);
    if (!id || !document.getElementById(id)) return;
    event.preventDefault();
    if (menuOpen) {
      pendingSection.current = id;
      setMenuOpen(false);
    } else scrollToSection(id);
  };

  return (
    <div ref={rootRef} id="home" className={styles.page} onClick={navigate}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header} data-hidden={!headerVisible && !menuOpen}>
        <a href="#home" className={styles.brand} aria-label="Liquifi home"><Image src="/landing/brand-mark.svg" width={21} height={21} alt="" />liquifi</a>
        <nav className={styles.desktopNav} aria-label="Main navigation">{LINKS.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}</nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.headerLogin}>Sign in</Link>
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen} onOpenChangeComplete={(open) => {
            if (!open && pendingSection.current) {
              const id = pendingSection.current;
              pendingSection.current = null;
              scrollToSection(id);
            }
          }}>
            <Dialog.Trigger type="button" className={styles.menuTrigger} aria-label="Open navigation"><Menu size={20} aria-hidden="true" /></Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className={styles.menuBackdrop} />
              <Dialog.Popup className={styles.menuPanel} aria-describedby={undefined}>
                <div className={styles.menuHeading}>
                  <Dialog.Title className={styles.brand}><Image src="/landing/brand-mark.svg" width={21} height={21} alt="" />liquifi</Dialog.Title>
                  <Dialog.Close className={styles.menuClose} aria-label="Close navigation"><X size={21} aria-hidden="true" /></Dialog.Close>
                </div>
                <nav aria-label="Mobile navigation">{LINKS.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}</nav>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>
      {children}
    </div>
  );
}
