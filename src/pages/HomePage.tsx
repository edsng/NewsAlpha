import { Link } from "react-router-dom";
import "./HomePage.css";

/*
 *  HomePage.tsx
 *  ─────────────────────────────────────────────
 *  Senior Design – News × Market Sector Analysis
 *
 *  Styles live in HomePage.css.
 *  Only truly dynamic values (per-sector colours, stagger delays)
 *  remain as inline styles.
 */

/* ────────────────────────── sector data ────────────────────────── */
interface Sector {
  name: string;
  ticker: string;
  color: string;
  description: string;
  icon: string;
  articles: number;
  accuracy: number;
  correlation: number;
  tradingDays: number;
}

const SECTORS: Sector[] = [
  { name: "Aerospace & Defense", ticker: "ITA",  color: "var(--red)",     description: "Geopolitical & defense-related news coverage",        icon: "▲", articles: 68489, accuracy: 48.7, correlation: 0.0292, tradingDays: 1178 },
  { name: "Financials",         ticker: "XLF",  color: "var(--amber)",   description: "Banks, insurance, capital markets & lending",         icon: "◆", articles: 43727, accuracy: 53.2, correlation: 0.0399, tradingDays: 1542 },
  { name: "Communication Svcs", ticker: "XLC",  color: "var(--cyan)",    description: "Media, telecom & interactive entertainment",          icon: "●", articles: 35215, accuracy: 51.4, correlation: -0.0219, tradingDays: 366 },
  { name: "Leisure & Ent.",     ticker: "PEJ",  color: "var(--pink)",    description: "Restaurants, hotels, travel & entertainment",         icon: "✦", articles: 28289, accuracy: 51.6, correlation: 0.0199, tradingDays: 1145 },
  { name: "Consumer Disc.",     ticker: "XLY",  color: "#06B6D4",        description: "Retail, autos, media & consumer services",            icon: "⬡", articles: 14471, accuracy: 53.9, correlation: 0.0071, tradingDays: 1014 },
  { name: "Industrials",        ticker: "XLI",  color: "#8B5CF6",        description: "Aerospace, machinery & transportation equipment",     icon: "⬢", articles: 12739, accuracy: 49.6, correlation: 0.0118, tradingDays: 1063 },
  { name: "Technology",         ticker: "XLK",  color: "var(--accent)",  description: "Software, hardware, semiconductors & IT services",    icon: "◎", articles: 8094,  accuracy: 53.7, correlation: 0.0377, tradingDays: 855 },
  { name: "Energy",             ticker: "XLE",  color: "#F97316",        description: "Oil & gas exploration, refining & equipment",          icon: "◼", articles: 8007,  accuracy: 49.1, correlation: -0.0363, tradingDays: 918 },
  { name: "Health Care",        ticker: "XLV",  color: "var(--green)",   description: "Pharma, biotech, medical devices & health providers", icon: "✚", articles: 6894,  accuracy: 52.6, correlation: -0.0358, tradingDays: 833 },
  { name: "Consumer Staples",   ticker: "XLP",  color: "#14B8A6",        description: "Food, beverage, household & personal products",       icon: "◇", articles: 4084,  accuracy: 52.3, correlation: -0.0345, tradingDays: 708 },
  { name: "Real Estate",        ticker: "XLRE", color: "var(--purple)",  description: "REITs, property management & development",            icon: "■", articles: 2120,  accuracy: 67.6, correlation: 0.1194, tradingDays: 37 },
  { name: "Homebuilders",       ticker: "XHB",  color: "#EC4899",        description: "Residential construction & building products",        icon: "△", articles: 1480,  accuracy: 51.5, correlation: 0.0812, tradingDays: 421 },
];

const TOTAL_ARTICLES = 233609;

/* ────────────────────────── helper: accuracy colour ────────────────────────── */
function accuColor(acc: number) {
  if (acc >= 53) return "var(--green)";
  if (acc >= 50) return "var(--text)";
  return "var(--red)";
}

/* ────────────────────────── StatChip ────────────────────────── */
function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="hp-stat">
      <span className="hp-stat__label">{label}</span>
      <span
        className="hp-stat__value hp-stat__value--mono"
        style={{ color: color || "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────── ArticleBar ────────────────────────── */
function ArticleBar({ articles, color }: { articles: number; color: string }) {
  const pct = Math.round((articles / TOTAL_ARTICLES) * 100);
  return (
    <div className="hp-bar">
      <div className="hp-bar__track">
        <div
          className="hp-bar__fill"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
          }}
        />
      </div>
      <span className="hp-bar__pct">{pct}%</span>
    </div>
  );
}

/* ────────────────────────── SectorCard ────────────────────────── */
function SectorCard({ sector, index }: { sector: Sector; index: number }) {
  const corrSign = sector.correlation >= 0 ? "+" : "";

  return (
    <div
      className="hp-card"
      style={{ animation: `fadeSlideUp 0.5s ease ${index * 0.07}s forwards` }}
    >
      {/* accent top-line */}
      <div
        className="hp-card__accent-line"
        style={{ background: `linear-gradient(90deg, ${sector.color}, transparent)` }}
      />

      {/* header */}
      <div className="hp-card__header">
        <div className="hp-card__name-group">
          <span className="hp-card__icon" style={{ color: sector.color }}>
            {sector.icon}
          </span>
          <span className="hp-card__name">{sector.name}</span>
        </div>
        <span
          className="hp-card__ticker"
          style={{ color: sector.color, background: `${sector.color}14` }}
        >
          {sector.ticker}
        </span>
      </div>

      {/* description */}
      <p className="hp-card__desc">{sector.description}</p>

      {/* dataset share bar */}
      <div className="hp-card__dataset">
        <div className="hp-card__dataset-header">
          <span className="hp-card__dataset-label">Dataset Share</span>
          <span className="hp-card__dataset-value">
            {sector.articles.toLocaleString()} articles
          </span>
        </div>
        <ArticleBar articles={sector.articles} color={sector.color} />
      </div>

      {/* stats */}
      <div className="hp-card__stats">
        <StatChip
          label="Accuracy"
          value={`${sector.accuracy}%`}
          color={accuColor(sector.accuracy)}
        />
        <StatChip
          label="Correlation"
          value={`${corrSign}${sector.correlation.toFixed(4)}`}
        />
        <StatChip label="Trade Days" value={sector.tradingDays.toLocaleString()} />
      </div>

      {/* small sample warning */}
      {sector.tradingDays < 50 && (
        <div className="hp-card__warning">
          <span className="hp-card__warning-text">
            ⚠ Small sample size — interpret with caution
          </span>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div className="hp-root">
      {/* ── NAV ── */}
      <nav className="hp-nav">
        <div className="hp-nav__brand">
          <span className="hp-nav__title">NewsAlpha</span>
        </div>
        <div className="hp-nav__links">
          <Link to="/" className="hp-nav-link hp-nav-link--active">Home</Link>
          <Link to="/analysis" className="hp-nav-link">Analysis</Link>
          <Link to="/paper" className="hp-nav-link">Paper</Link>
          <Link to="/ai-analyst" className="hp-nav-link">AI Analyst</Link>
          <Link to="/about" className="hp-nav-link">About</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hp-hero hp-grid-bg">
        <div className="hp-hero__glow" />
        <div className="hp-hero__inner">
          <div className="hp-badge">
            <span className="hp-badge__dot" />
            <span className="hp-badge__text">Senior Design Project 2026</span>
          </div>

          <h1 className="hp-hero__h1">
            How News Moves{" "}
            <span className="hp-hero__gradient-text">Markets</span>
          </h1>

          <p className="hp-hero__subtitle">
            Analyzing the impact of news sentiment across 12 S&P 500 sector ETFs
            — using VADER-based NLP, Apache Spark distributed processing, and
            correlation modeling on 233,609 articles.
          </p>

          <div className="hp-cta-row">
            <Link to="/analysis" className="hp-btn hp-btn--primary">Explore Analysis</Link>
            <Link to="/paper" className="hp-btn hp-btn--secondary">Read Paper</Link>
          </div>
        </div>
      </section>

      {/* ── SECTOR GRID ── */}
      <section className="hp-sectors">
        <div className="hp-sectors__header">
          <p className="hp-section-label">Sectors Analyzed</p>
          <h2 className="hp-sections__h2">
            Twelve S&P 500 sectors under the lens
          </h2>
          <p className="hp-sections__meta">
            {TOTAL_ARTICLES.toLocaleString()} articles analyzed across{" "}
            {SECTORS.length} sector ETFs ·{" "}
            {SECTORS.reduce((s, x) => s + x.tradingDays, 0).toLocaleString()}{" "}
            matched trading days
          </p>
        </div>

        <div className="hp-sectors__grid">
          {SECTORS.map((s, i) => (
            <SectorCard key={s.ticker} sector={s} index={i} />
          ))}
        </div>
      </section>

      {/* ── METHODOLOGY STRIP ── */}
      <section className="hp-methodology">
        {[
          { label: "01", title: "Data Collection",     desc: "233,609 articles scraped from sources ranging from The Guardian and BBC News to niche outlets like GlobeNewswire and Intl Business Times." },
          { label: "02", title: "Sentiment Analysis",  desc: "VADER NLP scoring classifies each article's tone, producing per-article compound sentiment values from −1 to +1." },
          { label: "03", title: "Sector Mapping",      desc: "Article categories are mapped to 12 S&P 500 sector ETFs via keyword-based PySpark expressions." },
          { label: "04", title: "Impact Modeling",     desc: "Pearson correlations and binary prediction accuracy measure how sentiment shifts relate to sector price movements." },
        ].map((step, i) => (
          <div
            key={step.label}
            style={{
              opacity: 0,
              animation: `fadeSlideUp 0.5s ease ${0.1 + i * 0.1}s forwards`,
            }}
          >
            <span className="hp-step__label">{step.label}</span>
            <h3 className="hp-step__title">{step.title}</h3>
            <p className="hp-step__desc">{step.desc}</p>
          </div>
        ))}
      </section>

      {/* ── FOOTER ── */}
      <footer className="hp-footer">
        <span className="hp-footer__copy">
          © 2026 NewsAlpha — Senior Design Project
        </span>
        <div className="hp-footer__links">
          <a href="https://github.com/edsng/NewsAlpha" target="_blank" rel="noopener noreferrer" className="hp-footer__link">GitHub</a>
          <span className="hp-footer__link">Documentation</span>
          <span className="hp-footer__link">Contact</span>
        </div>
      </footer>
    </div>
  );
}