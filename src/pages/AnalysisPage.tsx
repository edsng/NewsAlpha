import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./AnalysisPage.css";

/*
 *  AnalysisPage.tsx
 *  ─────────────────────────────────────────────
 *  Senior Design – Sentiment × Market Analysis Dashboard
 *
 *  All data below is MOCK. The component exposes a clean data
 *  contract so the backend can be swapped in later:
 *
 *    type AnalysisResult = {
 *      dailyData:   { date: string; sentiment: number; returnPct: number }[];
 *      correlation: number;
 *      accuracy:    number;
 *      tradingDays: number;
 *      meanSentiment: number;
 *      meanReturn:    number;
 *      articles:      number;
 *    };
 *
 *  Replace the `useMockData` hook with a real fetch when ready.
 */

/* ════════════════════ STATIC OPTION LISTS ════════════════════ */

const NEWS_SOURCES = [
  { value: "all",                        label: "All Sources" },
  { value: "The Guardian",               label: "The Guardian" },
  { value: "CNN-DailyMail/Other",        label: "CNN-DailyMail" },
  { value: "International Business Times", label: "Intl Business Times" },
  { value: "GlobeNewswire",              label: "GlobeNewswire" },
  { value: "The Times of India",         label: "Times of India" },
  { value: "BBC News",                   label: "BBC News" },
  { value: "NPR",                        label: "NPR" },
  { value: "Boing Boing",               label: "Boing Boing" },
  { value: "Business Insider",           label: "Business Insider" },
  { value: "Globalsecurity.org",         label: "Globalsecurity.org" },
  { value: "ABC News",                   label: "ABC News" },
];

const NEWS_SECTORS = [
  { value: "ITA",  label: "Aerospace & Defense" },
  { value: "XLF",  label: "Financials" },
  { value: "XLC",  label: "Communication Svcs" },
  { value: "PEJ",  label: "Leisure & Entertainment" },
  { value: "XLY",  label: "Consumer Discretionary" },
  { value: "XLI",  label: "Industrials" },
  { value: "XLK",  label: "Technology" },
  { value: "XLE",  label: "Energy" },
  { value: "XLV",  label: "Health Care" },
  { value: "XLP",  label: "Consumer Staples" },
  { value: "XLRE", label: "Real Estate" },
  { value: "XHB",  label: "Homebuilders" },
];

const MARKET_SECTORS = [...NEWS_SECTORS]; // same ETFs for market side

/* ════════════════════ API CONFIG ════════════════════ */

const API_BASE = "http://localhost:3001";

/* ════════════════════ DATA TYPES ════════════════════ */

interface DailyDatum {
  date: string;
  sentiment: number;
  returnPct: number;
}

interface PriceDatum {
  date: string;
  price: number;
  sentiment: number | null;
  returnPct: number;
  predicted: boolean | null;
}

interface AnalysisResult {
  dailyData: DailyDatum[];
  returnData: DailyDatum[];
  priceSeries: PriceDatum[];
  correlation: number;
  accuracy: number;
  tradingDays: number;
  meanSentiment: number;
  meanReturn: number;
  articles: number;
  bucketType: "weekly" | "monthly";
}

const EMPTY_RESULT: AnalysisResult = {
  dailyData: [],
  returnData: [],
  priceSeries: [],
  correlation: 0,
  accuracy: 0,
  tradingDays: 0,
  meanSentiment: 0,
  meanReturn: 0,
  articles: 0,
  bucketType: "monthly",
};

/* ════════════════════ DATA FETCH HOOK ════════════════════ */

function useAnalysisData(source: string, newsSector: string, mktSector: string) {
  const [data, setData] = useState<AnalysisResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ source, newsSector, mktSector });

    fetch(`${API_BASE}/api/analysis?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData({
          dailyData: json.dailyData ?? [],
          returnData: json.returnData ?? [],
          priceSeries: json.priceSeries ?? [],
          correlation: json.correlation ?? 0,
          accuracy: json.accuracy ?? 0,
          tradingDays: json.tradingDays ?? 0,
          meanSentiment: json.meanSentiment ?? 0,
          meanReturn: json.meanReturn ?? 0,
          articles: json.articles ?? 0,
          bucketType: json.bucketType ?? "monthly",
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch analysis data:", err);
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [source, newsSector, mktSector]);

  return { data, loading, error };
}

/* ════════════════════ SECTOR COLOURS ════════════════════ */

const SECTOR_COLORS: Record<string, string> = {
  ITA:  "#ef4444",
  XLF:  "#f59e0b",
  XLC:  "#06b6d4",
  PEJ:  "#ec4899",
  XLY:  "#06b6d4",
  XLI:  "#8b5cf6",
  XLK:  "#3b82f6",
  XLE:  "#f97316",
  XLV:  "#22c55e",
  XLP:  "#14b8a6",
  XLRE: "#a855f7",
  XHB:  "#ec4899",
};

/* ════════════════════ TINY COMPONENTS ════════════════════ */

function StatCard({
  label, value, detail, colorClass, delay,
}: {
  label: string; value: string; detail: string; colorClass: string; delay: string;
}) {
  return (
    <div className={`ap-stat-card ap-fade-in ${delay}`}>
      <div className="ap-stat-card__label">{label}</div>
      <div className={`ap-stat-card__value ${colorClass}`}>{value}</div>
      <div className="ap-stat-card__detail">{detail}</div>
    </div>
  );
}

/* ════════════════════ TOOLTIP POSITIONING HELPER ════════════════════ */

const TOOLTIP_W = 170; // approximate tooltip width in px

function tooltipStyle(x: number, y: number, containerW: number) {
  const overflowsRight = x + TOOLTIP_W + 12 > containerW;
  return {
    top: Math.max(y, 0),
    ...(overflowsRight
      ? { right: containerW - x + 8, left: "auto" as const }
      : { left: x + 8 }),
  };
}

/* ════════════════════ PRICE + PREDICTION OVERLAY + SENTIMENT SUB-CHART ════════════════════ */

function PriceChart({
  data,
}: {
  data: PriceDatum[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; datum: PriceDatum;
  } | null>(null);

  // Helper: is this a gap marker?
  const isGapPoint = (d: PriceDatum) => d.date === "___GAP___";

  // Filter out gap/spacer markers for calculations
  const realData = data.filter((d) => !isGapPoint(d));
  const prices = realData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const sentPoints = realData.filter((d) => d.sentiment !== null);
  const maxReturn = Math.max(...sentPoints.map((d) => Math.abs(d.returnPct)), 0.01);

  /* ── price chart geometry ── */
  const priceH = 260;
  const padLeft = 54;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 8;
  const plotH = priceH - padTop - padBottom;

  /* ── sentiment sub-chart geometry ── */
  const sentH = 80;
  const sentPadTop = 4;
  const sentPadBottom = 4;
  const sentPlotH = sentH - sentPadTop - sentPadBottom;

  /* build SVG polyline segments (break at gaps/spacers) */
  const pointCoords = data.map((d, i) => {
    if (isGapPoint(d)) return null;
    const x = (i / (data.length - 1)) * 100;
    const y = padTop + (1 - (d.price - minPrice) / priceRange) * plotH;
    return { x, y };
  });

  // Split into segments at gap markers
  const lineSegments: { x: number; y: number }[][] = [];
  let currentSeg: { x: number; y: number }[] = [];
  for (const pt of pointCoords) {
    if (pt === null) {
      if (currentSeg.length > 0) lineSegments.push(currentSeg);
      currentSeg = [];
    } else {
      currentSeg.push(pt);
    }
  }
  if (currentSeg.length > 0) lineSegments.push(currentSeg);
  /* y-axis labels */
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minPrice + (priceRange * (4 - i)) / 4;
    return { label: `$${val.toFixed(0)}`, top: padTop + (i / 4) * plotH };
  });

  const step = Math.ceil(data.length / 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* ═══ PRICE CHART ═══ */}
      <div
        ref={chartRef}
        className="ap-chart-body"
        style={{ minHeight: priceH, position: "relative" }}
      >
        {/* grid lines */}
        <div className="ap-chart-grid">
          {yTicks.map((_, i) => (
            <div key={i} className="ap-chart-grid__line" />
          ))}
        </div>

        {/* y-axis labels */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: padLeft, pointerEvents: "none" }}>
          {yTicks.map((t, i) => (
            <span
              key={i}
              className="ap-chart-y-label"
              style={{ position: "absolute", top: t.top, right: 8, transform: "translateY(-50%)" }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* prediction bars — skip gap markers */}
        <div
          style={{
            position: "absolute",
            left: padLeft,
            right: padRight,
            top: padTop,
            bottom: padBottom,
            pointerEvents: "none",
          }}
        >
          {data.map((d, i) => {
            if (isGapPoint(d) || d.sentiment === null) return null;
            const barH = (Math.abs(d.returnPct) / maxReturn) * plotH * 0.85;
            const correct = d.predicted === true;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(i / data.length) * 100}%`,
                  width: `${Math.max((1 / data.length) * 100, 0.8)}%`,
                  bottom: 0,
                  height: barH,
                  background: correct
                    ? "rgba(34, 197, 94, 0.16)"
                    : "rgba(239, 68, 68, 0.16)",
                  borderTop: `2px solid ${correct ? "var(--green)" : "var(--red)"}`,
                  borderRadius: "2px 2px 0 0",
                  pointerEvents: "auto",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                  setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 90, datum: d });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>

        {/* Gap separator lines — inside the plot area */}
        <div
          style={{
            position: "absolute",
            left: padLeft,
            right: padRight,
            top: 0,
            bottom: 0,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {data.map((d, i) =>
            d.date === "___GAP___" ? (
              <div
                key={`gap-${i}`}
                style={{
                  position: "absolute",
                  left: `${(i / (data.length - 1)) * 100}%`,
                  top: padTop,
                  bottom: padBottom,
                  width: 0,
                  borderLeft: "2px dashed var(--text-muted)",
                  opacity: 0.5,
                }}
              />
            ) : null
          )}
        </div>

        {/* SVG line segments + area fills */}
        <svg
          viewBox={`0 0 100 ${priceH}`}
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            left: padLeft,
            right: padRight,
            top: 0,
            bottom: 0,
            width: `calc(100% - ${padLeft + padRight}px)`,
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {lineSegments.map((seg, si) => {
            const segPolyline = seg.map((p) => `${p.x},${p.y}`).join(" ");
            const segArea = [
              `${seg[0].x},${padTop + plotH}`,
              ...seg.map((p) => `${p.x},${p.y}`),
              `${seg[seg.length - 1].x},${padTop + plotH}`,
            ].join(" ");
            return (
              <g key={si}>
                <polygon points={segArea} fill="url(#priceAreaGrad)" />
                <polyline
                  points={segPolyline}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "drop-shadow(0 0 3px rgba(59,130,246,0.4))" }}
                />
              </g>
            );
          })}
        </svg>

        {/* invisible hover zones — skip gaps */}
        <div
          style={{
            position: "absolute",
            left: padLeft,
            right: padRight,
            top: 0,
            bottom: 0,
            display: "flex",
          }}
        >
          {data.map((d, i) =>
            isGapPoint(d) ? (
              <div key={i} style={{ flex: 1 }} />
            ) : (
              <div
                key={i}
                style={{ flex: 1, cursor: "crosshair" }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                  setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 90, datum: d });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          )}
        </div>

        {/* tooltip */}
        {tooltip && (
          <div
            className="ap-chart-tooltip ap-chart-tooltip--visible"
            style={tooltipStyle(tooltip.x, Math.max(tooltip.y, 0), chartRef.current?.offsetWidth ?? 999)}
          >
            <div className="ap-chart-tooltip__title">{tooltip.datum.date}</div>
            <div className="ap-chart-tooltip__row">
              <span className="ap-chart-tooltip__label">Price</span>
              <span className="ap-chart-tooltip__value">${tooltip.datum.price.toFixed(2)}</span>
            </div>
            <div className="ap-chart-tooltip__row">
              <span className="ap-chart-tooltip__label">Return</span>
              <span
                className="ap-chart-tooltip__value"
                style={{ color: tooltip.datum.returnPct >= 0 ? "var(--green)" : "var(--red)" }}
              >
                {tooltip.datum.returnPct >= 0 ? "+" : ""}{tooltip.datum.returnPct.toFixed(2)}%
              </span>
            </div>
            {tooltip.datum.sentiment !== null && (
              <>
                <div className="ap-chart-tooltip__row">
                  <span className="ap-chart-tooltip__label">Sentiment</span>
                  <span
                    className="ap-chart-tooltip__value"
                    style={{ color: tooltip.datum.sentiment >= 0 ? "var(--green)" : "var(--red)" }}
                  >
                    {tooltip.datum.sentiment >= 0 ? "+" : ""}
                    {tooltip.datum.sentiment.toFixed(3)}
                  </span>
                </div>
                <div className="ap-chart-tooltip__row">
                  <span className="ap-chart-tooltip__label">Prediction</span>
                  <span
                    className="ap-chart-tooltip__value"
                    style={{ color: tooltip.datum.predicted ? "var(--green)" : "var(--red)" }}
                  >
                    {tooltip.datum.predicted ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ SENTIMENT SUB-CHART (RSI-style) ═══ */}
      <div className="ap-sent-sub">
        <div className="ap-sent-sub__label-area" style={{ width: padLeft }}>
          <span className="ap-chart-y-label" style={{ position: "absolute", top: sentPadTop, right: 8 }}>+1</span>
          <span className="ap-chart-y-label" style={{ position: "absolute", top: sentPadTop + sentPlotH / 2, right: 8 }}>0</span>
          <span className="ap-chart-y-label" style={{ position: "absolute", bottom: sentPadBottom, right: 8 }}>−1</span>
        </div>
        <div className="ap-sent-sub__plot" style={{ left: padLeft, right: padRight }}>
          {/* zero line */}
          <div className="ap-sent-sub__zero" style={{ top: sentPadTop + sentPlotH / 2 }} />
          {/* sentiment bars — skip gaps and spacers */}
          {data.map((d, i) => {
            if (isGapPoint(d) || d.sentiment === null) return null;
            const sent = d.sentiment;
            const barH = (Math.abs(sent) / 1) * (sentPlotH / 2);
            const isPos = sent >= 0;
            const top = isPos ? sentPadTop + sentPlotH / 2 - barH : sentPadTop + sentPlotH / 2;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(i / data.length) * 100}%`,
                  width: `${Math.max((1 / data.length) * 100, 0.8)}%`,
                  top,
                  height: barH,
                  background: isPos ? "var(--green)" : "var(--red)",
                  opacity: 0.6,
                  borderRadius: isPos ? "2px 2px 0 0" : "0 0 2px 2px",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* x-axis — show gap symbol at gaps */}
      <div className="ap-chart-x-axis" style={{ paddingLeft: padLeft }}>
        {data.map((d, i) => {
          if (d.date === "___GAP___") {
            return <span key={i} className="ap-chart-x-label" style={{ opacity: 0.4 }}>⋯</span>;
          }
          return i % step === 0 ? (
            <span key={i} className="ap-chart-x-label">{d.date}</span>
          ) : null;
        })}
      </div>
    </div>
  );
}

/* ════════════════════ SINGLE-METRIC BAR CHART ════════════════════ */

function SingleBarChart({
  data,
  dataKey,
  color,
  unit,
  formatValue,
}: {
  data: DailyDatum[];
  dataKey: "sentiment" | "returnPct";
  color: string;
  unit: string;
  formatValue: (v: number) => string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; datum: DailyDatum;
  } | null>(null);

  // Filter out gap markers for calculations
  const realData = data.filter((d) => d.date !== "___GAP___");
  const values = realData.map((d) => d[dataKey]);
  const maxAbs = Math.max(...values.map(Math.abs), 0.01);

  const yLabels = [
    `+${dataKey === "sentiment" ? maxAbs.toFixed(2) : maxAbs.toFixed(1) + "%"}`,
    "",
    "0",
    "",
    `−${dataKey === "sentiment" ? maxAbs.toFixed(2) : maxAbs.toFixed(1) + "%"}`,
  ];

  const step = Math.ceil(data.length / 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div ref={chartRef} className="ap-chart-body" style={{ minHeight: 200, paddingTop: 8 }}>
        {/* grid lines */}
        <div className="ap-chart-grid">
          {yLabels.map((_, i) => (
            <div key={i} className="ap-chart-grid__line" />
          ))}
        </div>

        {/* y-axis */}
        <div className="ap-chart-y-axis" style={{ width: 44 }}>
          {yLabels.map((l, i) => (
            <span key={i} className="ap-chart-y-label">{l}</span>
          ))}
        </div>

        {/* bars + gap separators */}
        <div className="ap-chart-bars" style={{ left: 44 }}>
          {data.map((d, i) => {
            const barW = Math.max((1 / data.length) * 100 - 0.3, 0.3);
            const barLeft = (i / data.length) * 100 + 0.15;

            // Gap marker — render a dashed separator line
            if (d.date === "___GAP___") {
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${barLeft + barW / 2}%`,
                    top: "10%",
                    bottom: "10%",
                    width: 0,
                    borderLeft: "2px dashed var(--text-muted)",
                    opacity: 0.5,
                    pointerEvents: "none",
                  }}
                />
              );
            }

            const val = d[dataKey];
            const h = (Math.abs(val) / maxAbs) * 45;
            const bottom = val >= 0 ? 50 : 50 - h;

            return (
              <div
                key={i}
                className="ap-chart-bar"
                style={{
                  position: "absolute",
                  left: `${barLeft}%`,
                  width: `${barW}%`,
                  bottom: `${bottom}%`,
                  height: `${h}%`,
                  background: color,
                  borderRadius: data.length > 80 ? "1px 1px 0 0" : "3px 3px 0 0",
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 50,
                    datum: d,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>

        {/* center zero line */}
        <div
          style={{
            position: "absolute",
            left: 44,
            right: 0,
            top: "50%",
            height: 1,
            background: "var(--border-light)",
            pointerEvents: "none",
          }}
        />

        {/* tooltip */}
        {tooltip && (
          <div
            className="ap-chart-tooltip ap-chart-tooltip--visible"
            style={tooltipStyle(tooltip.x, tooltip.y, chartRef.current?.offsetWidth ?? 999)}
          >
            <div className="ap-chart-tooltip__title">{tooltip.datum.date}</div>
            <div className="ap-chart-tooltip__row">
              <span className="ap-chart-tooltip__label">{unit}</span>
              <span className="ap-chart-tooltip__value">
                {formatValue(tooltip.datum[dataKey])}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* x-axis */}
      <div className="ap-chart-x-axis" style={{ paddingLeft: 44 }}>
        {data.map((d, i) => {
          if (d.date === "___GAP___") {
            return <span key={i} className="ap-chart-x-label" style={{ opacity: 0.4 }}>⋯</span>;
          }
          return i % step === 0 ? (
            <span key={i} className="ap-chart-x-label">{d.date}</span>
          ) : null;
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export default function AnalysisPage() {
  const [source, setSource] = useState("all");
  const [newsSector, setNewsSector] = useState("XLK");
  const [mktSector, setMktSector] = useState("XLK");

  // Source-sector coverage map: { source_name: [sector1, sector2, ...] }
  const [coverage, setCoverage] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/source-coverage`)
      .then((res) => res.json())
      .then((data) => setCoverage(data))
      .catch(() => {});
  }, []);

  const { data, loading, error } = useAnalysisData(source, newsSector, mktSector);

  // Determine which sectors are available for the selected source
  const availableSectors = source === "all" ? null : coverage[source] ?? [];

  const sentColor = SECTOR_COLORS[newsSector] || "var(--accent)";
  const retColor = SECTOR_COLORS[mktSector] || "var(--cyan)";

  const newsLabel = NEWS_SECTORS.find((s) => s.value === newsSector)?.label ?? newsSector;
  const mktLabel = MARKET_SECTORS.find((s) => s.value === mktSector)?.label ?? mktSector;
  const sourceLabel = NEWS_SOURCES.find((s) => s.value === source)?.label ?? source;

  /* accuracy from DB is 0–1, convert to percentage */
  const accPct = data.accuracy <= 1 ? data.accuracy * 100 : data.accuracy;

  /* accuracy colour helper */
  const accClass =
    accPct >= 53 ? "ap-color-green" : accPct >= 50 ? "ap-color-text" : "ap-color-red";
  const corrClass =
    data.correlation > 0.05 ? "ap-color-green" : data.correlation < -0.05 ? "ap-color-red" : "ap-color-text";

  return (
    <div className="ap-root">
      {/* ── NAV ── */}
      <nav className="ap-nav">
        <span className="ap-nav__title">NewsAlpha</span>
        <div className="ap-nav__links">
          <Link to="/" className="ap-nav-link">Home</Link>
          <Link to="/analysis" className="ap-nav-link ap-nav-link--active">Analysis</Link>
          <Link to="/paper" className="ap-nav-link">Paper</Link>
          <Link to="/ai-analyst" className="ap-nav-link">AI Analyst</Link>
          <Link to="/about" className="ap-nav-link">About</Link>
        </div>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div className="ap-header ap-fade-in ap-fade-in--d1">
        <p className="ap-header__label">Interactive Analysis</p>
        <h1 className="ap-header__h1">Sentiment vs. Market Performance</h1>
        <p className="ap-header__subtitle">
          Compare news sentiment from any source and sector against ETF returns.
          Select a combination below to explore the relationship.
        </p>
      </div>

      {/* ── CONTROLS ── */}
      <div className="ap-controls ap-fade-in ap-fade-in--d2">
        <div className="ap-control-group">
          <label className="ap-control-group__label">News Source</label>
          <select
            className="ap-select"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {NEWS_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="ap-control-group">
          <label className="ap-control-group__label">News Sector (Sentiment)</label>
          <select
            className="ap-select"
            value={newsSector}
            onChange={(e) => setNewsSector(e.target.value)}
          >
            {NEWS_SECTORS.map((s) => {
              const disabled = availableSectors !== null && !availableSectors.includes(s.value);
              return (
                <option
                  key={s.value}
                  value={s.value}
                  disabled={disabled}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                >
                  {s.label}{disabled ? " (no data)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div className="ap-controls__arrow">→</div>

        <div className="ap-control-group">
          <label className="ap-control-group__label">Market Sector (ETF Return)</label>
          <select
            className="ap-select"
            value={mktSector}
            onChange={(e) => setMktSector(e.target.value)}
          >
            {MARKET_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="ap-content">
        {/* charts column */}
        <div className="ap-charts-stack">
          {/* price + sentiment overlay chart */}
          <div className="ap-chart-panel ap-fade-in ap-fade-in--d3">
            <div className="ap-chart-panel__header">
              <div>
                <h2 className="ap-chart-panel__title">
                  {mktLabel} ETF Price History
                </h2>
                <p className="ap-chart-panel__desc">
                  {mktSector} price with prediction accuracy overlay · bar height = return magnitude · sentiment indicator below
                </p>
              </div>
              <div className="ap-chart-panel__legend">
                <div className="ap-legend-item">
                  <span className="ap-legend-dot" style={{ background: "var(--accent)" }} />
                  Price
                </div>
                <div className="ap-legend-item">
                  <span className="ap-legend-dot" style={{ background: "var(--green)" }} />
                  Correct
                </div>
                <div className="ap-legend-item">
                  <span className="ap-legend-dot" style={{ background: "var(--red)" }} />
                  Incorrect
                </div>
              </div>
            </div>
            <PriceChart data={data.priceSeries} />
          </div>

          {/* sentiment chart */}
          <div className="ap-chart-panel ap-fade-in ap-fade-in--d4">
            <div className="ap-chart-panel__header">
              <div>
                <h2 className="ap-chart-panel__title">
                  {newsLabel} News Sentiment
                </h2>
                <p className="ap-chart-panel__desc">
                  Source: {sourceLabel} · {data.bucketType === "weekly" ? "Weekly" : "Monthly"} avg VADER score · {data.dailyData.filter(d => d.date !== "___GAP___").length} {data.bucketType === "weekly" ? "weeks" : "months"}
                </p>
              </div>
              <div className="ap-chart-panel__legend">
                <div className="ap-legend-item">
                  <span className="ap-legend-dot" style={{ background: sentColor }} />
                  Sentiment
                </div>
              </div>
            </div>
            <SingleBarChart
              data={data.dailyData}
              dataKey="sentiment"
              color={sentColor}
              unit="Sentiment"
              formatValue={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`}
            />
          </div>

          {/* return chart */}
          <div className="ap-chart-panel ap-fade-in ap-fade-in--d5">
            <div className="ap-chart-panel__header">
              <div>
                <h2 className="ap-chart-panel__title">
                  {mktLabel} ETF Return
                </h2>
                <p className="ap-chart-panel__desc">
                  {mktSector} {data.bucketType === "weekly" ? "weekly" : "monthly"} avg return · {data.returnData.filter(d => d.date !== "___GAP___").length} {data.bucketType === "weekly" ? "weeks" : "months"}
                </p>
              </div>
              <div className="ap-chart-panel__legend">
                <div className="ap-legend-item">
                  <span className="ap-legend-dot" style={{ background: retColor }} />
                  Return %
                </div>
              </div>
            </div>
            <SingleBarChart
              data={data.returnData}
              dataKey="returnPct"
              color={retColor}
              unit="Return"
              formatValue={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
            />
          </div>
        </div>

        {/* sidebar */}
        <div className="ap-sidebar">
          <StatCard
            label="Prediction Accuracy"
            value={`${accPct.toFixed(1)}%`}
            detail={`${accPct >= 50 ? "Above" : "Below"} 50% random baseline`}
            colorClass={accClass}
            delay="ap-fade-in--d4"
          />
          <StatCard
            label="Pearson Correlation"
            value={`${data.correlation >= 0 ? "+" : ""}${data.correlation.toFixed(4)}`}
            detail={
              Math.abs(data.correlation) < 0.05
                ? "Negligible linear relationship"
                : data.correlation > 0
                ? "Weak positive association"
                : "Weak negative association"
            }
            colorClass={corrClass}
            delay="ap-fade-in--d5"
          />

          {/* detail card */}
          <div className="ap-source-card ap-fade-in ap-fade-in--d6">
            <div className="ap-source-card__header">Dataset Details</div>
            <div className="ap-source-card__row">
              <span className="ap-source-card__key">Articles</span>
              <span className="ap-source-card__val">{data.articles.toLocaleString()}</span>
            </div>
            <div className="ap-source-card__row">
              <span className="ap-source-card__key">Trading Days</span>
              <span className="ap-source-card__val">{data.tradingDays.toLocaleString()}</span>
            </div>
            <div className="ap-source-card__row">
              <span className="ap-source-card__key">Mean Sentiment</span>
              <span className="ap-source-card__val">
                {data.meanSentiment >= 0 ? "+" : ""}{data.meanSentiment.toFixed(3)}
              </span>
            </div>
            <div className="ap-source-card__row">
              <span className="ap-source-card__key">Mean Return</span>
              <span className="ap-source-card__val">
                {data.meanReturn >= 0 ? "+" : ""}{(data.meanReturn * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* status notice */}
          <div className="ap-notice ap-fade-in ap-fade-in--d7">
            <span className="ap-notice__icon">{error ? "⚠️" : loading ? "⏳" : "✓"}</span>
            <span className="ap-notice__text">
              {error ? (
                <>
                  <strong>Connection error.</strong> Could not reach the API server.
                  Make sure the backend is running on port 3001.
                </>
              ) : loading ? (
                <>
                  <strong>Loading...</strong> Fetching data from the database.
                </>
              ) : (
                <>
                  <strong>Live data.</strong> Showing results from {data.tradingDays.toLocaleString()} matched
                  trading days across {data.articles.toLocaleString()} articles.
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}