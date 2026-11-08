import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingExperience } from "@/components/landing/LandingExperience";
import { LandingAnimation } from "@/components/landing/LandingAnimation";
import { LandingIllustration } from "@/components/landing/LandingIllustration";
import { WorkflowCarousel } from "@/components/landing/WorkflowCarousel";
import styles from "@/components/landing/landing.module.css";

export const metadata: Metadata = {
  title: "Liquifi — From receipt to report",
  description: "A smarter way to manage council budgets and expenses. Record receipts, track your budget, and finalize financial reports with Liquifi.",
};

const FEATURES = [
  { label: "Capture Expenses", title: "Turn receipts into organized records.", description: "Upload receipt photos and let AI extract the details, amounts, and itemized expenses. Review before confirming.", asset: "receipt", width: 960, height: 752 },
  { label: "Monitor Your Budget", title: "Know where every peso goes.", description: "See your event's total budget, expenses, and remaining balance update as transactions are recorded.", asset: "budget", width: 1000, height: 760 },
  { label: "SIMPLIFY YOUR LIQUIDATION", title: "From recorded expenses to finalized reports.", description: "Generate financial reports, review approvals, and archive signed documents in one organized workflow.", asset: "workflow", width: 1024, height: 800 },
];
const STEPS = [
  { title: "Create an Event", description: "Set up your event and its budget in just a few steps.", asset: "create-event" },
  { title: "Record & Track Expenses", description: "Upload receipts or manually record expenses. Track your remaining budget in real time.", asset: "scan-details" },
  { title: "Generate & Finalize Reports", description: "Generate financial reports, get adviser approval, and archive signed documents.", asset: "finalize-reports" },
];

export default function LandingPage() {
  return (
    <LandingExperience>
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <section id="features" className={styles.features} aria-labelledby="features-title">
          <div className={styles.container}>
            <h2 id="features-title" className={styles.sectionTitle} data-landing-reveal="left">Everything your council needs to manage finances.</h2>
            <div className={styles.featureGrid}>
              {FEATURES.map(({ label, title, description, asset, width, height }, index) => (
                <article className={styles.featureCard} key={asset} data-landing-reveal={index === 0 ? "left" : index === 1 ? "right" : "down"} data-reveal-order={index}>
                  <div className={styles.featureCopy}><p className={styles.eyebrow}>{label}</p><h3>{title}</h3><p>{description}</p></div>
                  <LandingIllustration className={styles.featureArt} src={`/landing/features/liquifi-${asset}-character-gray.webp`} width={width} height={height} />
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="how-it-works" className={styles.howSection} aria-labelledby="how-title">
          <div className={styles.container}>
            <h2 id="how-title" className={styles.sectionTitle} data-landing-reveal="right">From Budget to Liquidation in Three Simple Steps.</h2>
            <WorkflowCarousel>
              {STEPS.map(({ title, description, asset }, index) => (
                <article className={styles.stepCard} key={asset} data-landing-reveal="down" data-reveal-order={index}>
                  <LandingIllustration className={styles.stepArt} src={`/landing/how_it_work/liquifi-${asset}-redrawn-gray.webp`} width={1024} height={768} />
                  <div className={styles.stepCopy}><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </WorkflowCarousel>
          </div>
        </section>
        <section className={styles.finalCta} aria-labelledby="cta-title">
          <div className={`${styles.container} ${styles.ctaInner}`}>
            <div className={styles.ctaCopy} data-landing-reveal="left">
              <h2 id="cta-title">Make Every Expense Accountable.</h2>
              <p>Simplify your council&apos;s financial management with Liquifi.</p>
              <div className={styles.actions}><Link href="/signup" className={styles.primaryButton}>Get started</Link><Link href="/login" className={styles.secondaryButton}>Sign in</Link></div>
            </div>
            <div className={styles.ctaArt} data-landing-reveal="right" data-reveal-order="1"><LandingAnimation src="/landing/fina_CTA/animation.json" poster="/landing/fina_CTA/poster.png" label="A council member working on a laptop above a stack of peso coins" /></div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span className={styles.watermark} aria-hidden="true">liquifi</span>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className={styles.footerIdentity} data-landing-reveal="down">
            <a href="#home" className={styles.brand} aria-label="Liquifi home"><Image src="/landing/brand-mark.svg" width={21} height={21} alt="" />liquifi</a>
            <p>Simplifying financial liquidation and budget tracking for Mabini Colleges department councils.</p>
          </div>
          <div className={styles.footerLinks} data-landing-reveal="down" data-reveal-order="1">
            <nav aria-label="Products"><h2>Products</h2><a href="#home">Home</a><a href="#features">Features</a><a href="#how-it-works">How it Works</a></nav>
            <div><h2>About</h2><button type="button" disabled title="Coming soon">About Liquifi</button><button type="button" disabled title="Coming soon">Mabini Colleges Inc.</button><button type="button" disabled title="Coming soon">Privacy and Policy</button></div>
          </div>
          <p className={styles.copyright} data-landing-reveal="down" data-reveal-order="2">© {new Date().getFullYear()} Liquifi. All rights reserved.</p>
        </div>
      </footer>
    </LandingExperience>
  );
}
