import { Link } from "react-router-dom";
import "./AboutPage.css";

/*
 *  AboutPage.tsx
 *  ─────────────────────────────────────────────
 *  Senior Design – Team & Contributions
 *
 *  Contributions are sourced from the Part 2 report
 *  Section 6: Team Member Contributions.
 *  "About" bios are placeholders — each member
 *  can fill in their own later.
 */

/* ════════════════════ TEAM DATA ════════════════════ */

interface Member {
  name: string;
  initials: string;
  color: string;
  role: string;
  contributions: string;
  about: string | null; // null = placeholder
}

const TEAM: Member[] = [
  {
    name: "Edward",
    initials: "E",
    color: "var(--amber)",
    role: "Execution & Validation",
    contributions:
      "Ran the final Spark jobs that produced the reported metrics and outputs, validated reproducibility, and helped execute and troubleshoot the code including paths, configs, and runtime issues. Designed and developed the front-end web interface including the Home, Analysis, Paper, and About pages.",
    about: null,
  },
  {
    name: "Gelvesh",
    initials: "G",
    color: "var(--green)",
    role: "Cross-Sector Analysis",
    contributions:
      "Implemented the cross-sector sentiment-to-market prediction analysis in Spark, computed correlation and accuracy across all sector pairs, exported the results to SQLite, and visualized the relationships using a heatmap.",
    about: null,
  },
  {
    name: "HaiShan",
    initials: "HS",
    color: "var(--pink)",
    role: "Data Integrity",
    contributions:
      "Verified dataset integrity to ensure correct Spark CSV parsing, including comma and quotation handling.",
    about: null,
  },
  {
    name: "John-Paul",
    initials: "JP",
    color: "var(--cyan)",
    role: "Data Processing",
    contributions:
      "Initial article data processing and preparation for the Spark pipeline.",
    about: null,
  },
  {
    name: "Josh",
    initials: "J",
    color: "var(--accent)",
    role: "Pipeline & Infrastructure",
    contributions:
      "Spark pipeline development, ETF data collection, benchmarking, pipeline integration, and exporting results to SQLite.",
    about: null,
  },
  {
    name: "Rafat",
    initials: "R",
    color: "var(--purple)",
    role: "Volatility Analysis",
    contributions:
      "Implemented an additional volatility analysis examining the relationship between average daily news sentiment and market volatility (measured as absolute daily return). Computed overall and per-sector Pearson correlations, identifying sector-specific asymmetries. Generated sector-level scatter plots with LOESS smoothing, sentiment quintile boxplots, and a correlation bar chart to visualize nonlinear and asymmetric effects. Exported all volatility analysis results into the project's SQLite database.",
    about: null,
  },
];

/* ════════════════════ MEMBER CARD ════════════════════ */

function MemberCard({ member, index }: { member: Member; index: number }) {
  return (
    <div
      className="ab-card"
      style={{
        opacity: 0,
        animation: `fadeSlideUp 0.5s ease ${0.1 + index * 0.07}s forwards`,
      }}
    >
      <div
        className="ab-card__accent"
        style={{ background: `linear-gradient(90deg, ${member.color}, transparent)` }}
      />

      <div
        className="ab-card__avatar"
        style={{ background: member.color }}
      >
        {member.initials}
      </div>

      <div className="ab-card__name">{member.name}</div>
      <div className="ab-card__role">{member.role}</div>

      <p className="ab-card__section-label">Contributions</p>
      <p className="ab-card__text">{member.contributions}</p>

      <p className="ab-card__section-label">About</p>
      {member.about ? (
        <p className="ab-card__text">{member.about}</p>
      ) : (
        <p className="ab-card__placeholder">Bio coming soon — check back later.</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export default function AboutPage() {
  return (
    <div className="ab-root">
      {/* ── NAV ── */}
      <nav className="ab-nav">
        <span className="ab-nav__title">NewsAlpha</span>
        <div className="ab-nav__links">
          <Link to="/" className="ab-nav-link">Home</Link>
          <Link to="/analysis" className="ab-nav-link">Analysis</Link>
          <Link to="/paper" className="ab-nav-link">Paper</Link>
          <Link to="/ai-analyst" className="ab-nav-link">AI Analyst</Link>
          <Link to="/about" className="ab-nav-link ab-nav-link--active">About</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="ab-hero">
        <p className="ab-hero__label">Group 7 · CS 179G · 2026</p>
        <h1 className="ab-hero__h1">Meet the Team</h1>
        <p className="ab-hero__subtitle">
          Six students exploring the intersection of natural language processing,
          distributed computing, and financial markets.
        </p>
      </header>

      {/* ── TEAM GRID ── */}
      <div className="ab-team">
        {TEAM.map((m, i) => (
          <MemberCard key={m.name} member={m} index={i} />
        ))}
      </div>

      {/* ── FOOTER ── */}
      <footer className="ab-footer">
        <span className="ab-footer__copy">© 2026 NewsAlpha — Senior Design Project</span>
        <div className="ab-footer__links">
          <Link to="/" className="ab-footer__link">Home</Link>
          <Link to="/analysis" className="ab-footer__link">Analysis</Link>
          <Link to="/paper" className="ab-footer__link">Paper</Link>
        </div>
      </footer>
    </div>
  );
}