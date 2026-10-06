import { formatPHP } from "@/lib/format";
import styles from "@/components/landing/landing.module.css";

type Props = { variant: "hero" | "receipt" | "report" };

export function LedgerIllustration({ variant }: Props) {
  if (variant === "receipt") {
    return (
      <svg viewBox="0 0 480 390" fill="none" aria-hidden="true" className={styles.illustration}>
        <ellipse cx="238" cy="336" rx="140" ry="16" fill="var(--color-accent)" opacity=".05" />
        <g transform="rotate(-9 240 195)">
          <rect x="147" y="33" width="193" height="300" rx="30" fill="var(--color-accent)" />
          <rect x="156" y="44" width="175" height="275" rx="23" fill="var(--color-info-lightest)" />
          <rect x="213" y="43" width="62" height="14" rx="7" fill="var(--color-accent)" />
          <g className={styles.floating}>
            <path d="M187 89H298V274L284 265L270 274L256 265L242 274L228 265L214 274L200 265L187 274Z" fill="var(--color-surface)" stroke="var(--color-border-strong)" strokeWidth="2" />
            <path d="M208 119H276M208 132H255M208 176H276M208 190H276M208 204H248" stroke="var(--color-border-strong)" strokeWidth="5" strokeLinecap="round" />
            <text x="242" y="157" textAnchor="middle" fill="var(--color-accent)" fontSize="17" fontWeight="600">{formatPHP(1250)}</text>
            <path d="M210 236H275" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" />
          </g>
          <path className={styles.scanLine} d="M170 111H316" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" />
          <path d="M175 104V89H190M311 104V89H296M175 258V273H190M311 258V273H296" stroke="var(--color-success-dark)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className={styles.floatSlow}>
          <circle cx="355" cy="254" r="41" fill="var(--color-landing-lime)" />
          <path d="M338 254L349 265L372 241" stroke="var(--color-success-dark)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className={styles.floatReverse} fill="var(--color-landing-lilac)">
          <path d="M92 135L103 112L114 135L137 146L114 157L103 180L92 157L69 146Z" />
          <circle cx="379" cy="108" r="9" />
        </g>
      </svg>
    );
  }

  if (variant === "report") {
    return (
      <svg viewBox="0 0 480 390" fill="none" aria-hidden="true" className={styles.illustration}>
        <ellipse cx="240" cy="337" rx="146" ry="17" fill="var(--color-accent)" opacity=".05" />
        <g transform="rotate(7 245 180)">
          <rect x="142" y="49" width="215" height="273" rx="18" fill="var(--color-landing-lilac-side)" />
          <rect x="131" y="38" width="215" height="273" rx="18" fill="var(--color-surface)" stroke="var(--color-border-strong)" strokeWidth="2" />
          <rect x="155" y="64" width="37" height="37" rx="10" fill="var(--color-landing-lilac)" />
          <path d="M166 82L172 88L182 76" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
          <text x="205" y="79" fill="var(--color-accent)" fontSize="11" fontWeight="600">FINANCIAL</text>
          <text x="205" y="96" fill="var(--color-accent)" fontSize="11" fontWeight="600">REPORT</text>
          <path d="M157 127H320M157 149H320M157 171H320M157 193H320" stroke="var(--color-border)" strokeWidth="4" strokeLinecap="round" />
          <path d="M260 119V202M157 221H320" stroke="var(--color-border)" strokeWidth="2" />
          <path className={styles.signature} d="M162 267C187 228 194 266 171 273C192 254 193 279 209 261C218 250 218 271 229 267L246 261" stroke="var(--color-success-dark)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className={styles.floatSlow}>
          <path d="M321 198L368 213V253C368 281 344 299 321 312C298 299 274 281 274 253V213Z" fill="var(--color-landing-lime)" stroke="var(--color-success-dark)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M300 252L314 266L342 237" stroke="var(--color-success-dark)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className={styles.floatReverse}>
          <rect x="72" y="102" width="55" height="55" rx="16" transform="rotate(-18 72 102)" fill="var(--color-warning-light)" />
          <circle cx="383" cy="83" r="10" fill="var(--color-landing-lilac)" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 600 500" fill="none" aria-hidden="true" className={styles.illustration}>
      <ellipse cx="318" cy="433" rx="197" ry="24" fill="var(--color-accent)" opacity=".055" />
      <path d="M93 226C50 156 97 91 168 104M460 114C528 127 548 171 519 214" stroke="var(--color-border-strong)" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" />
      <g transform="rotate(8 354 258)">
        <g className={styles.floatSlow}>
          <path d="M199 195C199 183 209 173 221 173H292L314 194H469C480 194 489 203 489 214V369C489 381 479 391 467 391H221C209 391 199 381 199 369Z" fill="var(--color-success-dark)" />
          <rect x="220" y="149" width="242" height="208" rx="17" fill="var(--color-surface-secondary)" transform="rotate(-4 220 149)" />
          <rect x="224" y="155" width="227" height="208" rx="16" fill="var(--color-surface)" />
          <path d="M247 181H394M247 196H355" stroke="var(--color-border)" strokeWidth="8" strokeLinecap="round" />
          <path d="M189 247C187 233 198 220 212 220H470C484 220 495 233 493 247L477 390C476 402 466 411 454 411H229C217 411 207 402 206 390Z" fill="var(--color-landing-lime)" />
          <path d="M213 237H474" stroke="var(--color-surface)" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" />
          <g className={styles.eyes} fill="var(--color-accent)">
            <rect x="290" y="282" width="14" height="24" rx="7" />
            <rect x="360" y="282" width="14" height="24" rx="7" />
          </g>
          <ellipse cx="278" cy="318" rx="15" ry="8" fill="var(--color-success)" opacity=".25" />
          <ellipse cx="387" cy="318" rx="15" ry="8" fill="var(--color-success)" opacity=".25" />
          <path d="M316 321C322 336 342 336 350 321" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" />
          <path d="M209 326C179 325 177 299 164 292M480 310C507 306 515 286 524 281" stroke="var(--color-success-dark)" strokeWidth="12" strokeLinecap="round" />
          <path d="M261 408L252 432M419 408L429 430" stroke="var(--color-success-dark)" strokeWidth="16" strokeLinecap="round" />
        </g>
      </g>
      <g transform="rotate(-13 192 186)">
        <g className={styles.floating}>
          <path d="M106 74C106 64 114 56 124 56H253C263 56 271 64 271 74V280L254 269L238 280L221 269L205 280L188 269L172 280L155 269L139 280L122 269L106 280Z" fill="var(--color-warning-light)" />
          <path d="M133 84H218M133 101H242" stroke="var(--color-warning)" strokeOpacity=".4" strokeWidth="7" strokeLinecap="round" />
          <g className={styles.eyes} fill="var(--color-accent)">
            <ellipse cx="160" cy="145" rx="8" ry="12" />
            <ellipse cx="211" cy="145" rx="8" ry="12" />
          </g>
          <path d="M176 170C181 176 190 176 196 170" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" />
          <path d="M134 209H243M134 228H210" stroke="var(--color-warning)" strokeOpacity=".45" strokeWidth="7" strokeLinecap="round" />
          <path d="M108 175C78 173 72 160 74 147" stroke="var(--color-warning-dark)" strokeWidth="9" strokeLinecap="round" />
        </g>
      </g>
      <g transform="rotate(-15 103 367)">
        <g className={styles.floatReverse}>
          <rect x="53" y="298" width="100" height="126" rx="22" fill="var(--color-info)" />
          <rect x="50" y="290" width="100" height="126" rx="22" fill="var(--color-info-light)" />
          <rect x="66" y="305" width="67" height="30" rx="8" fill="var(--color-surface)" />
          <text x="99" y="326" textAnchor="middle" fontSize="19" fontWeight="600" fill="var(--color-info-dark)">123</text>
          {[0, 1, 2].map((row) => [0, 1, 2].map((col) => <rect key={`${row}-${col}`} x={67 + col * 24} y={349 + row * 19} width="16" height="12" rx="4" fill={col === 2 ? "var(--color-info)" : "var(--color-surface)"} />))}
        </g>
      </g>
      <g className={styles.floatReverse}>
        <circle cx="467" cy="87" r="37" fill="var(--color-warning)" />
        <circle cx="461" cy="81" r="34" fill="var(--color-warning-light)" />
        <text x="461" y="95" textAnchor="middle" fontSize="36" fontWeight="600" fill="var(--color-warning-dark)">₱</text>
      </g>
      <g className={styles.floating} fill="var(--color-landing-lilac)">
        <path d="M334 60L343 82L365 91L343 100L334 122L325 100L303 91L325 82Z" />
        <circle cx="553" cy="314" r="9" />
        <circle cx="65" cy="232" r="6" />
      </g>
    </svg>
  );
}
