import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check } from "lucide-react";
import { LedgerIllustration } from "@/components/landing/LedgerIllustration";
import styles from "@/components/landing/landing.module.css";

export function HeroSection() {
  return (
    <section className={`${styles.hero} ${styles.container}`} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span className={styles.liveDot} /> A little less admin. A lot more impact.</p>
        <h1 id="hero-title" className={styles.heroTitle} data-text-reveal>
          <span>Big plans.</span>{" "}<span>Clear budgets.</span>{" "}
          <span className={styles.heroAccent}>Happy councils.</span>
        </h1>
        <p className={styles.heroDescription}>You bring the ideas. We help with the numbers. Turn receipts into clear budgets and financial reports, all in one place.</p>
        <div className={styles.actions}>
          <Link href="/signup" className={styles.primaryButton}>Get started <ArrowUpRight size={18} aria-hidden="true" /></Link>
          <a href="#how" className={styles.textButton}>See how it works <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
        <p className={styles.heroNote}><Check size={15} aria-hidden="true" /> Built for Mabini Colleges department councils</p>
      </div>
      <div className={styles.heroVisual} data-ambient>
        <div className={styles.heroOrbit} aria-hidden="true" />
        <div className={styles.illustrationParallax} data-pointer-layer="12">
          <LedgerIllustration variant="hero" />
        </div>
        <span className={`${styles.heroSticker} ${styles.floating}`}><span className={styles.stickerCheck}><Check size={16} aria-hidden="true" /></span> A little more organized.</span>
        <span className={styles.visualCaption}>LESS PAPER. MORE PEACE OF MIND.</span>
      </div>
    </section>
  );
}
