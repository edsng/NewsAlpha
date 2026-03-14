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
      "Ran the final Spark pipeline jobs that produced the reported metrics and validated reproducibility across the workflow. Assisted with execution, debugging, and troubleshooting of paths, configs, and runtime issues. Designed and developed the project's web interface, including the Home, Analysis, Paper, and About pages, and helped implement the earlier Express/Node backend before the project migrated to the university-cluster setup.",
    about: null,
  },
  {
    name: "Gelvesh",
    initials: "G",
    color: "var(--green)",
    role: "Cross-Sector Analysis",
    contributions:
      "Implemented the cross-sector sentiment-to-market prediction analysis in Spark, computing sector-pair correlations and exporting the results to SQLite for visualization. Also helped migrate the backend analysis workflow from local SQLite to clustered MySQL and collaborated on prompt design for the LLM-driven SQL analytics pipeline so it could generate chart-ready outputs from natural language questions.",
    about: null,
  },
  {
    name: "HaiShan",
    initials: "HS",
    color: "var(--pink)",
    role: "Data Integrity",
    contributions:
      "Verified dataset integrity and helped identify the critical CSV parsing bug where Spark's default escape handling silently dropped thousands of rows. After the corrected dataset became available, updated analysis components and regenerated portions of the analysis tables so the final reported results reflected the corrected parsing pipeline.",
    about: null,
  },
  {
    name: "John-Paul",
    initials: "JP",
    color: "var(--cyan)",
    role: "Data Processing",
    contributions:
      "Led early article processing and cleaning, generated sentiment analysis with a Spark NLP pipeline, filled missing category data to expand usable coverage, and standardized dates to build a cohesive dataset. For the AI Analyst system, engineered the natural-language-to-SQL prompt flow, built an initial backend testing environment, added SQL safety guardrails, contributed to the dynamic charting workflow, and documented the prompt-engineering pitfalls discussed in the report.",
    about: null,
  },
  {
    name: "Josh",
    initials: "J",
    color: "var(--accent)",
    role: "Pipeline & Infrastructure",
    contributions:
      "Led core pipeline and infrastructure work across the project, including ETF data collection, PySpark ingestion on the university cluster, and the multi-stage joins used for same-sector, source-aware, and cross-sector analysis. Identified and fixed the critical CSV parsing bug, authored the rebuild pipeline used to regenerate the final tables, added revision-request visualizations, and architected the backend data pipeline connecting the frontend, LLM workflow, and MySQL database.",
    about: null,
  },
  {
    name: "Rafat",
    initials: "R",
    color: "var(--purple)",
    role: "Volatility Analysis",
    contributions:
      "Implemented the project's additional volatility analysis and produced several of the major time-series evaluation components, including aggregate trends over time, best-sector analysis, best-vs-worst sector comparisons, and lag-effect analysis. Generated the associated plots, exported the analysis outputs into the project database, and contributed several of the report's key figures and supporting analysis.",
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