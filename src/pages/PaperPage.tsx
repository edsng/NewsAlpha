import { Link } from "react-router-dom";
import "./PaperPage.css";

/*
 *  PaperPage.tsx
 *  ─────────────────────────────────────────────
 *  Senior Design – Research findings summary
 *  Presents the CS 179G Part 2 analysis in a
 *  readable, editorial-style layout with inline
 *  charts and data tables.
 */

/* ════════════════════ DATA FROM REPORT ════════════════════ */

const SECTOR_ACCURACY = [
  { ticker: "XLRE", accuracy: 67.6, days: 37,   note: "* small sample" },
  { ticker: "XLY",  accuracy: 53.9, days: 1014, note: "" },
  { ticker: "XLK",  accuracy: 53.7, days: 855,  note: "" },
  { ticker: "XLF",  accuracy: 53.2, days: 1542, note: "" },
  { ticker: "XLV",  accuracy: 52.6, days: 833,  note: "" },
  { ticker: "XLP",  accuracy: 52.3, days: 708,  note: "" },
  { ticker: "PEJ",  accuracy: 51.6, days: 1145, note: "" },
  { ticker: "XHB",  accuracy: 51.5, days: 421,  note: "" },
  { ticker: "XLC",  accuracy: 51.4, days: 366,  note: "" },
  { ticker: "XLI",  accuracy: 49.6, days: 1063, note: "" },
  { ticker: "XLE",  accuracy: 49.1, days: 918,  note: "" },
  { ticker: "ITA",  accuracy: 48.7, days: 1178, note: "" },
];

const SOURCE_ACCURACY = [
  { source: "GlobeNewswire",       accuracy: 66.4, days: 116,  sentiment: 0.929, note: "* positivity bias" },
  { source: "Intl Business Times", accuracy: 57.1, days: 126,  sentiment: 0.134, note: "" },
  { source: "Times of India",      accuracy: 54.8, days: 115,  sentiment: 0.340, note: "" },
  { source: "CNN-DailyMail",       accuracy: 53.2, days: 3947, sentiment: 0.150, note: "" },
  { source: "The Guardian",        accuracy: 51.6, days: 8066, sentiment: 0.233, note: "" },
  { source: "Boing Boing",         accuracy: 51.2, days: 84,   sentiment: 0.218, note: "" },
  { source: "NPR",                 accuracy: 48.4, days: 91,   sentiment: 0.091, note: "" },
  { source: "BBC News",            accuracy: 47.9, days: 194,  sentiment: -0.260, note: "" },
  { source: "Business Insider",    accuracy: 46.9, days: 162,  sentiment: -0.018, note: "" },
  { source: "Globalsecurity.org",  accuracy: 46.5, days: 114,  sentiment: 0.176, note: "" },
  { source: "ABC News",            accuracy: 31.6, days: 76,   sentiment: -0.214, note: "" },
];

const NEXT_DAY = [
  { sector: "XLRE", sameDay: 67.6, nextDay: 58.3, change: -9.3 },
  { sector: "XLY",  sameDay: 53.9, nextDay: 55.1, change: +1.2 },
  { sector: "XLV",  sameDay: 52.6, nextDay: 53.6, change: +1.0 },
  { sector: "XLK",  sameDay: 53.7, nextDay: 51.8, change: -1.9 },
  { sector: "XLF",  sameDay: 53.2, nextDay: 51.3, change: -1.9 },
  { sector: "PEJ",  sameDay: 51.6, nextDay: 52.3, change: +0.7 },
  { sector: "ITA",  sameDay: 48.7, nextDay: 49.5, change: +0.8 },
];

/* ════════════════════ HORIZONTAL BAR COMPONENT ════════════════════ */

function AccuracyBar({
  label,
  accuracy,
  extra,
  color,
  wideLabel,
}: {
  label: string;
  accuracy: number;
  extra?: string;
  color: string;
  wideLabel?: boolean;
}) {
  // scale: 30% to 70% maps to 0% to 100% bar width
  const pct = Math.max(0, Math.min(100, ((accuracy - 30) / 40) * 100));
  const refPct = ((50 - 30) / 40) * 100; // 50% baseline position

  return (
    <div className="pp-hbar__row">
      <span className={`pp-hbar__label${wideLabel ? " pp-hbar__label--wide" : ""}`}>{label}</span>
      <div className="pp-hbar__track">
        <div className="pp-hbar__ref-line" style={{ left: `${refPct}%` }} />
        <div
          className="pp-hbar__fill"
          style={{ width: `${pct}%`, background: color }}
        >
          <span className="pp-hbar__value">{accuracy}%</span>
        </div>
      </div>
      {extra && <span className="pp-hbar__extra">{extra}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export default function PaperPage() {
  return (
    <div className="pp-root">
      {/* ── NAV ── */}
      <nav className="pp-nav">
        <span className="pp-nav__title">NewsAlpha</span>
        <div className="pp-nav__links">
          <Link to="/" className="pp-nav-link">Home</Link>
          <Link to="/analysis" className="pp-nav-link">Analysis</Link>
          <Link to="/paper" className="pp-nav-link pp-nav-link--active">Paper</Link>
          <Link to="/ai-analyst" className="pp-nav-link">AI Analyst</Link>
          <Link to="/about" className="pp-nav-link">About</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="pp-hero">
        <p className="pp-hero__label">CS 179G · Group 7 · February 2026</p>
        <h1 className="pp-hero__h1">
          Predicting Market Direction Using Distributed Sentiment Analysis of Financial News
        </h1>
        <p className="pp-hero__authors">
          Edward · Gelvesh · HaiShan · John-Paul · Josh · Rafat
        </p>
        <p className="pp-hero__meta">
          Apache Spark 3.5.8 · VADER NLP · 12 S&P 500 Sector ETFs · 2012–2024
        </p>
      </header>

      {/* ── KEY STATS ── */}
      <div className="pp-stats-strip">
        {[
          { value: "233,609", label: "Articles Analyzed" },
          { value: "12", label: "Sector ETFs" },
          { value: "10,080", label: "Matched Trading Days" },
          { value: "51.7%", label: "Overall Accuracy" },
          { value: "0.014", label: "Avg Correlation" },
        ].map((s) => (
          <div key={s.label} className="pp-stat-pill">
            <div className="pp-stat-pill__value">{s.value}</div>
            <div className="pp-stat-pill__label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="pp-body">
        {/* ── ABSTRACT ── */}
        <section className="pp-section">
          <span className="pp-section__number">01</span>
          <h2 className="pp-section__h2">Abstract</h2>
          <p className="pp-p">
            This study investigates whether news sentiment, measured by VADER compound scores across 233,609 articles from 11 sources, can predict the daily market direction of 12 S&P 500 sector ETFs. Using Apache Spark for distributed processing, we computed same-day and next-day prediction accuracy, Pearson correlations between sentiment and returns, cross-sector effects, source-level reliability, and sentiment-volatility relationships. The overall same-day prediction accuracy of <strong>51.7%</strong> modestly exceeds the 50% random baseline, with certain sectors and sources achieving meaningfully higher accuracy.
          </p>
        </section>

        {/* ── SAME-DAY PREDICTION ── */}
        <section className="pp-section">
          <span className="pp-section__number">02</span>
          <h2 className="pp-section__h2">Same-Day Prediction Accuracy</h2>
          <p className="pp-p">
            Binary prediction accuracy measures how often positive sentiment correctly predicts a green (up) market day, and negative sentiment predicts a red (down) day. <strong>Consumer Discretionary (XLY)</strong>, <strong>Technology (XLK)</strong>, and <strong>Financials (XLF)</strong> achieve 53–54% accuracy with large sample sizes (800–1,500 trading days), making these results statistically meaningful. Notably, ITA (Aerospace & Defense) has the most articles (68,489) but the worst prediction accuracy (48.7%), demonstrating that more news coverage does not guarantee better predictive power.
          </p>

          {/* accuracy chart */}
          <div className="pp-chart-card">
            <h3 className="pp-chart-card__title">Same-Day Prediction Accuracy by Sector</h3>
            <p className="pp-chart-card__desc">
              Dashed line = 50% random baseline · XLRE excluded from ranking due to n=37
            </p>
            <div className="pp-hbar">
              {SECTOR_ACCURACY.map((s) => (
                <AccuracyBar
                  key={s.ticker}
                  label={s.ticker}
                  accuracy={s.accuracy}
                  extra={`${s.days.toLocaleString()} days`}
                  color={
                    s.accuracy >= 53
                      ? "var(--green)"
                      : s.accuracy >= 50
                      ? "var(--accent)"
                      : "var(--red)"
                  }
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── NEXT-DAY PREDICTION ── */}
        <section className="pp-section">
          <span className="pp-section__number">03</span>
          <h2 className="pp-section__h2">Next-Day Prediction (Lagged Analysis)</h2>
          <p className="pp-p">
            To test whether news sentiment can predict the <em>following</em> trading day's direction, a lagged analysis was performed using Spark window functions. Overall next-day accuracy was <strong>51.1%</strong> vs. 51.7% same-day. Most sectors showed slightly lower next-day accuracy, which is expected — news and markets tend to react to the same events simultaneously.
          </p>
          <p className="pp-p">
            However, <strong>XLY (Consumer Discretionary) improved from 53.9% to 55.1%</strong> next-day, and <strong>XLV (Health Care) improved from 52.6% to 53.6%</strong>. This suggests that consumer and health sector news may have a delayed market effect, representing a potentially actionable signal.
          </p>

          {/* next-day table */}
          <div className="pp-table-wrap">
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Same-Day</th>
                  <th>Next-Day</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {NEXT_DAY.map((r) => (
                  <tr key={r.sector}>
                    <td className="pp-table__mono">{r.sector}</td>
                    <td>{r.sameDay}%</td>
                    <td>{r.nextDay}%</td>
                    <td style={{ color: r.change > 0 ? "var(--green)" : r.change < 0 ? "var(--red)" : "var(--text)" }}>
                      {r.change > 0 ? "+" : ""}{r.change}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SOURCE RELIABILITY ── */}
        <section className="pp-section">
          <span className="pp-section__number">04</span>
          <h2 className="pp-section__h2">News Source Reliability</h2>
          <p className="pp-p">
            Financially-focused outlets produce stronger market signals. <strong>International Business Times (57.1%)</strong> is the most genuinely predictive source, with balanced sentiment (0.134) and 126 trading days of data. GlobeNewswire achieves 66.4% accuracy but this is misleading — as a press release service with overwhelmingly positive content (mean sentiment 0.929), it nearly always predicts "green," exploiting the market's upward bias rather than providing real predictive value.
          </p>
          <p className="pp-p">
            Conversely, <strong>BBC News (47.9%)</strong> and <strong>ABC News (31.6%)</strong> perform below random chance, likely because their editorial tone skews negative regardless of market conditions.
          </p>

          {/* source chart */}
          <div className="pp-chart-card">
            <h3 className="pp-chart-card__title">Prediction Accuracy by News Source</h3>
            <p className="pp-chart-card__desc">
              Minimum 50 trading days · dashed line = 50% random baseline
            </p>
            <div className="pp-hbar">
              {SOURCE_ACCURACY.map((s) => (
                <AccuracyBar
                  key={s.source}
                  label={s.source}
                  accuracy={s.accuracy}
                  extra={`sent: ${s.sentiment >= 0 ? "+" : ""}${s.sentiment.toFixed(2)}`}
                  wideLabel
                  color={
                    s.accuracy >= 53
                      ? "var(--green)"
                      : s.accuracy >= 50
                      ? "var(--accent)"
                      : "var(--red)"
                  }
                />
              ))}
            </div>
          </div>

          <div className="pp-callout">
            <div className="pp-callout__title">On inverting below-50% sources</div>
            <p className="pp-callout__text">
              While using sub-50% sources for profit via inversion seems intriguing, naively inverting the predictions of persistently negative sources is equivalent to buying every sector on nearly every trading day — capturing only the long-term upward bias in equity markets rather than any genuine predictive signal.
            </p>
          </div>
        </section>

        {/* ── CROSS-SECTOR ── */}
        <section className="pp-section">
          <span className="pp-section__number">05</span>
          <h2 className="pp-section__h2">Cross-Sector Effects</h2>
          <p className="pp-p">
            Beyond same-sector analysis, we tested whether sentiment from one sector could predict returns in a different sector. The strongest observed relationships all involve <strong>Real Estate (XLRE) sentiment</strong>, which correlated at 0.469 with Technology (XLK) returns and 0.376 with Financials (XLF) returns. However, these are based on only 37 overlapping trading days.
          </p>
          <p className="pp-p">
            Cross-sector sentiment correlations reveal structural media relationships: <strong>Defense–Homebuilders</strong> sentiment correlation of 0.263 and <strong>Financials–Real Estate</strong> at 0.206 reflect genuine economic linkages in how media covers related sectors.
          </p>
        </section>

        {/* ── VOLATILITY ── */}
        <section className="pp-section">
          <span className="pp-section__number">06</span>
          <h2 className="pp-section__h2">Sentiment & Market Volatility</h2>
          <p className="pp-p">
            The overall Pearson correlation between daily sentiment and absolute daily return (a proxy for volatility) is <strong>r = −0.026</strong> — statistically significant due to sample size but negligible in magnitude. Eleven of twelve sectors show correlations between −0.08 and +0.09.
          </p>
          <p className="pp-p">
            The sole exception is <strong>Real Estate (XLRE)</strong> with r = −0.496, though this is based on only 37 days. LOESS smoothing reveals a nonlinear pattern: volatility is highest when sentiment is strongly negative, declines through neutral, and rises slightly at extreme positive sentiment. This U-shaped asymmetry is consistent with loss aversion and the sector's sensitivity to interest rate expectations.
          </p>

          <div className="pp-callout">
            <div className="pp-callout__title">Key insight: nonlinear effects</div>
            <p className="pp-callout__text">
              The XLRE quintile analysis shows Q1 (most negative sentiment) has median absolute return of ~1.3%, while Q4 (moderately positive) shows ~0.3%. This pattern is not captured by simple linear correlation, demonstrating the value of examining multiple dimensions of the sentiment–market relationship.
            </p>
          </div>
        </section>

        {/* ── KEY FINDINGS ── */}
        <section className="pp-section">
          <span className="pp-section__number">07</span>
          <h2 className="pp-section__h2">Key Findings</h2>

          <h3 className="pp-section__h3">1. Sentiment carries a measurable but weak signal</h3>
          <p className="pp-p">
            Overall same-day correlation of 0.014 and prediction accuracy of 51.7% exceed random chance but fall far short of a reliable trading signal. This is consistent with the efficient market hypothesis.
          </p>

          <h3 className="pp-section__h3">2. Some sectors are more predictable</h3>
          <p className="pp-p">
            Consumer Discretionary (XLY) and Technology (XLK) show 53–54% same-day accuracy with large sample sizes, possibly because these sectors have higher retail investor participation and are more sentiment-driven.
          </p>

          <h3 className="pp-section__h3">3. More articles ≠ better predictions</h3>
          <p className="pp-p">
            ITA has the most articles (68,489) but the worst accuracy (48.7%). High volumes of geopolitical news introduce noise that dilutes the sentiment signal.
          </p>

          <h3 className="pp-section__h3">4. Delayed effects exist in certain sectors</h3>
          <p className="pp-p">
            XLY and XLV show improved next-day accuracy compared to same-day, suggesting consumer and health sector news takes longer to be fully priced in.
          </p>

          <h3 className="pp-section__h3">5. Source selection matters significantly</h3>
          <p className="pp-p">
            International Business Times (57.1%) substantially outperforms general outlets like BBC News (47.9%) and ABC News (31.6%). Financially-focused coverage contains more market-relevant signals.
          </p>

          <h3 className="pp-section__h3">6. Sector-specific nonlinear effects exist</h3>
          <p className="pp-p">
            Real Estate shows asymmetric volatility responses to sentiment — negative news generates stronger price reactions than positive news, consistent with behavioral finance theory.
          </p>
        </section>

        {/* ── METHODOLOGY SUMMARY ── */}
        <section className="pp-section">
          <span className="pp-section__number">08</span>
          <h2 className="pp-section__h2">Methodology</h2>
          <p className="pp-p">
            Articles from four source datasets (Global News, News Articles, Guardian News, CNN-DailyMail) were cleaned, deduplicated, and scored using VADER sentiment analysis. Each article's category was mapped to one of 12 S&P 500 sector ETFs via keyword-based PySpark expressions. Articles were aggregated by date and sector, then joined with historical ETF price data from Yahoo Finance (2012–2024). The inner join produced 10,080 matched records representing trading days with corresponding news coverage.
          </p>
          <p className="pp-p">
            Analysis included Pearson correlation, binary directional prediction, cross-sector correlation matrices, lagged next-day prediction via window functions, source-level accuracy decomposition, and volatility analysis with LOESS smoothing and sentiment quintile breakdowns. All results were stored in SQLite for the web interface backend.
          </p>
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="pp-footer">
        <span className="pp-footer__copy">© 2026 NewsAlpha — Senior Design Project</span>
        <div className="pp-footer__links">
          <Link to="/" className="pp-footer__link">Home</Link>
          <Link to="/analysis" className="pp-footer__link">Analysis</Link>
          <span className="pp-footer__link">GitHub</span>
        </div>
      </footer>
    </div>
  );
}