import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, CheckCheck, ChevronDown, FileCheck2, GraduationCap, Landmark, Layers3, LockKeyhole, ReceiptText, ScanLine, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingExperience } from "@/components/landing/LandingExperience";
import { LedgerIllustration } from "@/components/landing/LedgerIllustration";
import { formatPHP } from "@/lib/format";
import styles from "@/components/landing/landing.module.css";

export const metadata: Metadata = {
  title: "Liquifi — Big plans. Clear budgets.",
  description: "Less paperwork for your council. Capture receipts, track event budgets, and bring financial reports from adviser review to signed archive with Liquifi.",
};

const PAIN_POINTS = [
  { icon: ReceiptText, before: "Receipts everywhere?", title: "Give every expense a home.", body: "Keep receipt photos and manual entries together, organized by event." },
  { icon: Wallet, before: "Does the budget still add up?", title: "Know where you stand.", body: "See your total, spent, and remaining budget without another round of arithmetic." },
  { icon: FileCheck2, before: "Another last-minute report?", title: "Close the loop with clarity.", body: "Bring expenses, adviser decisions, and financial reports into one shared workflow." },
];

const QUESTIONS = [
  { q: "Who can use Liquifi?", a: "Liquifi is built for Mabini Colleges department councils. Treasurers and advisers can sign up for their department. After email verification, an adviser or admin reviews the application before access is activated." },
  { q: "What if an expense has no receipt?", a: "Use a manual entry. Liquifi calculates the total from the details you provide and sends it to your department adviser for review. Approved expenses are then deducted from the event budget." },
  { q: "Do I still need to check the AI results?", a: "Yes. Review the extracted receipt details before confirming. If something is wrong, discard it and upload a clearer photo. Receipt entries only affect your budget after you confirm them." },
  { q: "How do reports and signatures work?", a: "Once expenses are resolved, generate a financial report for adviser approval. After approval, download and print it for physical signing, then upload every signed page to archive the event. Archived events remain read-only." },
];

export default function LandingPage() {
  return (
    <LandingExperience>
      <main id="main-content" tabIndex={-1}>
        <HeroSection />

        <section className={`${styles.container} ${styles.audienceStrip}`} aria-label="Built for your council">
          <p>One council.<br /><strong>Everyone in the loop.</strong></p>
          <span><Landmark size={21} aria-hidden="true" /> Treasurers</span>
          <span><GraduationCap size={23} aria-hidden="true" /> Advisers</span>
          <span><ShieldCheck size={21} aria-hidden="true" /> Administrators</span>
          <span className={styles.schoolLabel}>Made for<br /><strong>Mabini Colleges</strong></span>
        </section>

        <section id="features" className={`${styles.container} ${styles.section}`} aria-labelledby="features-title">
          <div className={styles.sectionIntro} data-reveal>
            <p className={styles.eyebrow}>LESS CHASING. MORE DOING.</p>
            <h2 id="features-title" className={styles.sectionTitle}>Your council has big things to do.<br /><span className={styles.mutedHeading}>Paperwork shouldn’t be one of them.</span></h2>
          </div>
          <div className={styles.problemGrid}>
            {PAIN_POINTS.map(({ icon: Icon, before, title, body }, index) => (
              <article className={styles.problemCard} key={title} data-reveal>
                <span className={styles.cardIndex}>0{index + 1}</span>
                <span className={styles.iconTile}><Icon size={27} strokeWidth={1.7} aria-hidden="true" /></span>
                <p className={styles.problemBefore}>{before}</p>
                <h3>{title}</h3><p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className={`${styles.container} ${styles.workflowSection}`} aria-labelledby="how-title">
          <div className={styles.centerIntro} data-reveal>
            <p className={styles.eyebrow}>A SMALL ROUTINE. A BIG DIFFERENCE.</p>
            <h2 id="how-title" className={styles.sectionTitle}>From first receipt<br />to final <span className={styles.underlined}>“all done.”</span></h2>
            <p>Three steps to a little more peace of mind.</p>
          </div>

          <article className={styles.workflowRow}>
            <div className={`${styles.artPanel} ${styles.receiptPanel}`} data-ambient data-reveal>
              <LedgerIllustration variant="receipt" />
              <span className={styles.artCaption}><ScanLine size={16} aria-hidden="true" /> Snap it. Review it. Keep it.</span>
            </div>
            <div className={styles.workflowCopy} data-reveal>
              <span className={styles.stepLabel}>01 / CAPTURE</span>
              <h3 className={styles.featureTitle}>A photo is worth<br />a lot of typing.</h3>
              <p>Snap your receipt and let AI read the details. Review the supplier, amount, and line items before adding the expense to your event.</p>
              <ul className={styles.checkList}>
                <li><Check size={17} aria-hidden="true" /> Receipt photos, neatly organized</li>
                <li><Check size={17} aria-hidden="true" /> A manual option when there’s no receipt</li>
                <li><Check size={17} aria-hidden="true" /> You review. You confirm.</li>
              </ul>
              <Link href="/signup" className={styles.inlineLink}>Meet your new paper trail <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </article>

          <article className={`${styles.workflowRow} ${styles.reverseRow}`}>
            <div className={styles.workflowCopy} data-reveal>
              <span className={styles.stepLabel}>02 / KEEP TRACK</span>
              <h3 className={styles.featureTitle}>Less “wait, how much?”<br />More “we’ve got this.”</h3>
              <p>Know what’s been spent and what’s still available. Your event budget updates as expenses are confirmed or approved, with overspending clearly flagged.</p>
              <ul className={styles.checkList}>
                <li><Check size={17} aria-hidden="true" /> Total, spent, and remaining at a glance</li>
                <li><Check size={17} aria-hidden="true" /> A shared view for your adviser</li>
                <li><Check size={17} aria-hidden="true" /> A record of decisions and corrections</li>
              </ul>
            </div>
            <div className={styles.budgetPanel} data-reveal>
              <div className={styles.previewTopline}><span><span className={styles.liveDot} /> YOUR EVENT, AT A GLANCE</span><span>Illustrative preview</span></div>
              <div className={styles.budgetCard}>
                <div className={styles.budgetCardTitle}><span className={styles.previewFolder}><Layers3 size={22} aria-hidden="true" /></span><div><strong>Council Week</strong><p>Every little detail, accounted for.</p></div></div>
                <p className={styles.budgetLabel}>REMAINING BUDGET</p>
                <p className={styles.budgetNumber}>{formatPHP(12500)}</p>
                <div className={styles.budgetSplit}><span>Total <strong>{formatPHP(20000)}</strong></span><span>Spent <strong>{formatPHP(7500)}</strong></span></div>
                <div className={styles.budgetTrack}><div data-grow /></div>
                <p className={styles.budgetHealth}><CheckCheck size={15} aria-hidden="true" /> 37.5% used. Looking good.</p>
              </div>
              <div className={styles.previewEntry}><span className={styles.entryIcon}><ReceiptText size={19} aria-hidden="true" /></span><div><strong>Event supplies</strong><span>Receipt reviewed & confirmed</span></div><strong>{formatPHP(1250)}</strong><Check size={17} className="text-success-dark" aria-hidden="true" /></div>
              <span className={styles.previewFootnote}>A clearer picture. Without the calculator.</span>
            </div>
          </article>

          <article className={styles.workflowRow}>
            <div className={`${styles.artPanel} ${styles.reportPanel}`} data-ambient data-reveal>
              <LedgerIllustration variant="report" />
              <span className={styles.artCaption}><ShieldCheck size={16} aria-hidden="true" /> A record you can come back to.</span>
            </div>
            <div className={styles.workflowCopy} data-reveal>
              <span className={styles.stepLabel}>03 / WRAP IT UP</span>
              <h3 className={styles.featureTitle}>The end of an event.<br />Not a paper chase.</h3>
              <p>Turn resolved expenses into a financial report. Send it for adviser approval, collect the physical signatures, and keep the signed pages in a lasting archive.</p>
              <ul className={styles.checkList}>
                <li><Check size={17} aria-hidden="true" /> Financial reports, ready for review</li>
                <li><Check size={17} aria-hidden="true" /> Clear approval and revision history</li>
                <li><Check size={17} aria-hidden="true" /> Signed records, kept in one place</li>
              </ul>
              <Link href="/signup" className={styles.inlineLink}>Make your next event simpler <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </article>
        </section>

        <section className={`${styles.container} ${styles.valuesSection}`} aria-labelledby="values-title" data-reveal>
          <div className={styles.valuesHeading}><p className={styles.eyebrow}>BUILT AROUND YOUR COUNCIL</p><h2 id="values-title" className={styles.sectionTitle}>A little structure.<br />A lot of confidence.</h2></div>
          <div className={styles.valueList}>
            <article><LockKeyhole size={24} aria-hidden="true" /><div><h3>Your department’s own space.</h3><p>Role-based access keeps council records with the people responsible for them.</p></div></article>
            <article><CheckCheck size={24} aria-hidden="true" /><div><h3>Everyone knows the next step.</h3><p>From a pending expense to an approved report, the status is always part of the story.</p></div></article>
            <article><Layers3 size={24} aria-hidden="true" /><div><h3>Ready for the next council, too.</h3><p>Records belong to your department, so the history stays when responsibilities change.</p></div></article>
          </div>
        </section>

        <section id="questions" className={`${styles.container} ${styles.faqSection}`} aria-labelledby="questions-title">
          <div data-reveal><p className={styles.eyebrow}>GOOD QUESTIONS.</p><h2 id="questions-title" className={styles.sectionTitle}>Let’s clear<br />a few things up.</h2><p className={styles.faqAside}>A simpler process starts with<br />knowing what to expect.</p></div>
          <div className={styles.faqList}>
            {QUESTIONS.map(({ q, a }) => <details key={q} className={styles.faqItem}><summary>{q}<ChevronDown size={19} aria-hidden="true" /></summary><p>{a}</p></details>)}
          </div>
        </section>

        <section id="get-started" className={styles.finalCta} data-final-cta data-ambient aria-labelledby="cta-title">
          <div className={styles.numberField} aria-hidden="true">
            {["7", "24", "8", "100", "12", "5", "0"].map((number) => <div key={number} className={styles.numberPosition} data-number-drift><div className={styles.numberParallax} data-pointer-layer="20"><span className={styles.numberTile}>{number}</span></div></div>)}
            <span className={styles.ctaSpark}><Sparkles size={46} strokeWidth={1.5} /></span>
          </div>
          <div className={styles.ctaCopy}>
            <p className={styles.eyebrow}>HERE’S TO YOUR NEXT BIG THING.</p>
            <h2 id="cta-title" className={styles.ctaTitle} data-text-reveal><span>Make it count.</span>{" "}<span>We’ll help you</span>{" "}<span>keep count.</span></h2>
            <p>Less time sorting receipts.<br />More time making things happen.</p>
            <Link href="/signup" className={styles.primaryButton}>Let’s get started <ArrowUpRight size={19} aria-hidden="true" /></Link>
            <Link href="/login" className={styles.ctaSignIn}>Already part of a council? <span>Sign in</span></Link>
          </div>
        </section>
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <div><Link href="/" className={styles.brand}>Liquifi<span className={styles.brandDot}>.</span></Link><p>Big plans. Clear budgets.<br />Made for your council.</p></div>
        <nav aria-label="Footer navigation"><a href="#features">Why Liquifi</a><a href="#how">How it works</a><a href="#questions">FAQs</a></nav>
        <nav aria-label="Account links"><Link href="/signup">Create an account <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/login">Sign in</Link><a href="#main-content">Back to top <ArrowDown className="rotate-180" size={14} aria-hidden="true" /></a></nav>
        <div className={styles.footerBottom}><span>Liquifi · Mabini Colleges</span><span>From first receipt to final report.</span></div>
      </footer>
    </LandingExperience>
  );
}
