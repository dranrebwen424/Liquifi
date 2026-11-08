import Link from "next/link";
import { LandingAnimation } from "@/components/landing/LandingAnimation";
import styles from "@/components/landing/landing.module.css";

export function HeroSection() {
  return (
    <section className={`${styles.hero} ${styles.container}`} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <h1 id="hero-title" data-landing-reveal="down">From Receipt Recording To Report Generation. All in one place.</h1>
        <p data-landing-reveal="down" data-reveal-order="1">A smarter way to manage council budgets and expenses.</p>
        <div className={styles.actions} data-landing-reveal="down" data-reveal-order="2"><Link href="/signup" className={styles.primaryButton}>Get started</Link><Link href="/login" className={styles.secondaryButton}>Sign in</Link></div>
      </div>
      <div className={styles.heroPreview} data-landing-reveal="down" data-reveal-order="3"><LandingAnimation src="/landing/hero-animation.json" label="Liquifi walkthrough: create events, record expenses, and generate reports" controls /></div>
    </section>
  );
}
