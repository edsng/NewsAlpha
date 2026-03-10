/**
 *  server.js
 *  ─────────────────────────────────────────────
 *  NewsAlpha API Server (MySQL)
 *
 *  Endpoints:
 *    GET /api/analysis?source=all&newsSector=XLK&mktSector=XLK
 *    GET /api/health
 *
 *  Run:  node server.js
 *  Port: 3001 (or PORT env var)
 */

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

/* ════════════════════ DATABASE POOL ════════════════════ */

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "newsalpha",
  waitForConnections: true,
  connectionLimit: 10,
});

/* ════════════════════ HELPERS ════════════════════ */

// Parse "MM-DD-YYYY" → sortable timestamp
function parseDate(dateStr) {
  const [m, d, y] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

// Format "MM-DD-YYYY" → "Jan '19"
function formatDateShort(dateStr) {
  const [m, , y] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`;
}

/* ════════════════════ ENDPOINTS ════════════════════ */

app.get("/api/health", async (req, res) => {
  try {
    const [tables] = await pool.execute(
      "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = ?",
      [process.env.MYSQL_DATABASE || "newsalpha"]
    );
    res.json({ status: "ok", tables });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

app.get("/api/analysis", async (req, res) => {
  try {
    const { source = "all", newsSector = "XLK", mktSector = "XLK" } = req.query;
    const isSameSector = newsSector === mktSector;
    const isAllSources = source === "all";

    /* ── 1. Sentiment data ── */
    // When filtering by source, we need to aggregate from the articles table
    // When "all sources", use the precomputed joined_sentiment_market table
    let sentByDate = {};

    if (isAllSources) {
      const [rows] = await pool.execute(
        `SELECT date, avg_sentiment, article_count, daily_return_pct, market_direction
         FROM joined_sentiment_market WHERE sector = ? ORDER BY date`,
        [newsSector]
      );
      for (const r of rows) {
        sentByDate[r.date] = {
          avg_sentiment: r.avg_sentiment,
          article_count: r.article_count,
          daily_return_pct: r.daily_return_pct,
          market_direction: r.market_direction,
        };
      }
    } else {
      // Aggregate sentiment per date for this source + sector combo
      const [rows] = await pool.execute(
        `SELECT date, AVG(sentiment_score) as avg_sentiment, COUNT(*) as article_count
         FROM articles
         WHERE source_name = ? AND mapped_sector = ?
         GROUP BY date ORDER BY date`,
        [source, newsSector]
      );
      for (const r of rows) {
        sentByDate[r.date] = {
          avg_sentiment: r.avg_sentiment,
          article_count: r.article_count,
        };
      }
    }

    /* ── 2. Market data for the market sector (from ETF prices) ── */
    const [mktRows] = await pool.execute(
      `SELECT date, close_price, daily_return_pct, market_direction
       FROM etf_prices WHERE ticker = ? ORDER BY date`,
      [mktSector]
    );

    const mktByDate = {};
    for (const r of mktRows) {
      mktByDate[r.date] = r;
    }

    /* ── 3. If filtering by source, we need market data joined in ── */
    if (!isAllSources) {
      // Enrich sentByDate with market direction from etf_prices for the NEWS sector
      const [newsMarket] = await pool.execute(
        `SELECT date, market_direction, daily_return_pct
         FROM etf_prices WHERE ticker = ?`,
        [newsSector]
      );
      const newsMktByDate = {};
      for (const r of newsMarket) {
        newsMktByDate[r.date] = r;
      }
      // Attach market direction to sentiment rows
      for (const date of Object.keys(sentByDate)) {
        if (newsMktByDate[date]) {
          sentByDate[date].market_direction = newsMktByDate[date].market_direction;
          sentByDate[date].daily_return_pct = newsMktByDate[date].daily_return_pct;
        }
      }
    }

    /* ── 4. dailyData: matched dates ── */
    const allSentDates = Object.keys(sentByDate);
    const matchedDates = allSentDates
      .filter((d) => mktByDate[d])
      .sort((a, b) => parseDate(a) - parseDate(b));

    const dailyData = matchedDates.map((d) => ({
      date: formatDateShort(d),
      sentiment: sentByDate[d].avg_sentiment,
      returnPct: mktByDate[d].daily_return_pct,
    }));

    /* ── 5. priceSeries: ETF prices scoped to sentiment segments with gap splitting ── */
    const sortedMkt = mktRows.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const sentDatesSorted = Object.keys(sentByDate).sort((a, b) => parseDate(a) - parseDate(b));

    // Detect clusters of sentiment dates separated by large gaps (>6 months)
    const PRICE_GAP_THRESHOLD = 180 * 86400000;
    const sentClusters = []; // array of { start: timestamp, end: timestamp }
    let clusterStart = null;
    let clusterEnd = null;

    for (let i = 0; i < sentDatesSorted.length; i++) {
      const t = parseDate(sentDatesSorted[i]);
      if (clusterStart === null) {
        clusterStart = t;
        clusterEnd = t;
      } else if (t - clusterEnd > PRICE_GAP_THRESHOLD) {
        sentClusters.push({ start: clusterStart, end: clusterEnd });
        clusterStart = t;
        clusterEnd = t;
      } else {
        clusterEnd = t;
      }
    }
    if (clusterStart !== null) sentClusters.push({ start: clusterStart, end: clusterEnd });

    // Build price series: include price data for each cluster with padding, insert gap spacers between
    const priceSeries = [];
    const GAP_SPACER_COUNT = 15; // number of empty slots to create visual gap space

    for (let c = 0; c < sentClusters.length; c++) {
      const cluster = sentClusters[c];
      const span = cluster.end - cluster.start;
      const pad = Math.max(span * 0.08, 30 * 86400000);

      // Insert gap spacers between clusters
      if (c > 0) {
        for (let g = 0; g < GAP_SPACER_COUNT; g++) {
          priceSeries.push({
            date: g === Math.floor(GAP_SPACER_COUNT / 2) ? "___GAP___" : "___SPACER___",
            price: 0,
            sentiment: null,
            returnPct: 0,
            predicted: null,
          });
        }
      }

      // Filter price data to this cluster's range + padding
      const clusterPrices = sortedMkt.filter((r) => {
        const t = parseDate(r.date);
        return t >= cluster.start - pad && t <= cluster.end + pad;
      });

      for (const p of clusterPrices) {
        const sent = sentByDate[p.date];
        const sentiment = sent ? sent.avg_sentiment : null;
        const predicted =
          sentiment !== null
            ? (sentiment >= 0 && p.daily_return_pct >= 0) || (sentiment < 0 && p.daily_return_pct < 0)
            : null;

        priceSeries.push({
          date: formatDateShort(p.date),
          price: p.close_price,
          sentiment,
          returnPct: p.daily_return_pct,
          predicted,
        });
      }
    }

    /* ── 6. Stats ── */
    let correlation = 0;
    let accuracy = 0;
    let tradingDays = matchedDates.length;
    let meanSentiment = 0;
    let meanReturn = 0;

    if (isAllSources) {
      // Use precomputed tables
      if (isSameSector) {
        const [corrRows] = await pool.execute(
          "SELECT correlation, mean_sentiment, mean_return, days FROM sector_correlations WHERE sector = ?",
          [newsSector]
        );
        const [accRows] = await pool.execute(
          "SELECT accuracy, num_days FROM prediction_accuracy WHERE sector = ?",
          [newsSector]
        );
        if (corrRows[0]) {
          correlation = corrRows[0].correlation;
          meanSentiment = corrRows[0].mean_sentiment;
          meanReturn = corrRows[0].mean_return;
        }
        if (accRows[0]) {
          accuracy = accRows[0].accuracy;
          tradingDays = accRows[0].num_days;
        }
      } else {
        const [crossCorr] = await pool.execute(
          "SELECT correlation, days FROM cross_sector_correlations WHERE sent_sector = ? AND mkt_sector = ?",
          [newsSector, mktSector]
        );
        const [crossAcc] = await pool.execute(
          "SELECT accuracy, days FROM cross_sector_prediction_accuracy WHERE sent_sector = ? AND mkt_sector = ?",
          [newsSector, mktSector]
        );
        if (crossCorr[0]) {
          correlation = crossCorr[0].correlation;
          tradingDays = crossCorr[0].days;
        }
        if (crossAcc[0]) accuracy = crossAcc[0].accuracy;

        // Compute means from matched data
        if (matchedDates.length > 0) {
          meanSentiment = matchedDates.reduce((s, d) => s + sentByDate[d].avg_sentiment, 0) / matchedDates.length;
          meanReturn = matchedDates.reduce((s, d) => s + mktByDate[d].daily_return_pct, 0) / matchedDates.length;
        }
      }
    } else {
      // Source-specific: check precomputed source_accuracy table
      const [srcRows] = await pool.execute(
        "SELECT accuracy, num_days, mean_sentiment FROM source_accuracy WHERE source_name = ?",
        [source]
      );
      if (srcRows[0]) {
        accuracy = srcRows[0].accuracy;
        meanSentiment = srcRows[0].mean_sentiment;
      }

      // Compute correlation and mean return from matched data
      if (matchedDates.length > 1) {
        const sents = matchedDates.map((d) => sentByDate[d].avg_sentiment);
        const rets = matchedDates.map((d) => mktByDate[d].daily_return_pct);
        correlation = pearson(sents, rets);
        meanReturn = rets.reduce((a, b) => a + b, 0) / rets.length;
        if (!meanSentiment) meanSentiment = sents.reduce((a, b) => a + b, 0) / sents.length;
      }
    }

    // Article count — from the full articles table, not just matched trading days
    let articles = 0;
    if (isAllSources) {
      const [artRows] = await pool.execute(
        "SELECT COUNT(*) as cnt FROM articles WHERE mapped_sector = ?",
        [newsSector]
      );
      articles = artRows[0]?.cnt ?? 0;
    } else {
      const [artRows] = await pool.execute(
        "SELECT COUNT(*) as cnt FROM articles WHERE mapped_sector = ? AND source_name = ?",
        [newsSector, source]
      );
      articles = artRows[0]?.cnt ?? 0;
    }

    // Determine the date range of sentiment data to scope both charts
    const sentDates = Object.keys(sentByDate).sort((a, b) => parseDate(a) - parseDate(b));
    const minSentDate = sentDates.length > 0 ? parseDate(sentDates[0]) : 0;
    const maxSentDate = sentDates.length > 0 ? parseDate(sentDates[sentDates.length - 1]) : 0;

    // Filter market data to only the sentiment date range
    const mktInRange = mktRows.filter((r) => {
      const t = parseDate(r.date);
      return t >= minSentDate && t <= maxSentDate;
    });

    // Determine bucket strategy based on matched trading day count
    // < 90 days → weekly, >= 90 days → monthly
    const useWeekly = matchedDates.length < 90;

    // Week bucket key: "W01 '19" format
    function getWeekKey(dateStr) {
      const [m, d, y] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      const jan1 = new Date(dt.getFullYear(), 0, 1);
      const week = Math.ceil(((dt.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `W${String(week).padStart(2, "0")} '${String(dt.getFullYear()).slice(2)}`;
    }

    function getBucketKey(dateStr) {
      return useWeekly ? getWeekKey(dateStr) : formatDateShort(dateStr);
    }

    // Sort helper for both "Mon 'YY" and "W01 'YY" formats
    const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function sortBucketKey(a, b) {
      const ayMatch = a.match(/'(\d+)$/);
      const byMatch = b.match(/'(\d+)$/);
      const ay = ayMatch ? parseInt(ayMatch[1]) : 0;
      const by = byMatch ? parseInt(byMatch[1]) : 0;
      if (ay !== by) return ay - by;
      if (a.startsWith("W") && b.startsWith("W")) {
        return parseInt(a.slice(1)) - parseInt(b.slice(1));
      }
      const am = a.split(" '")[0];
      const bm = b.split(" '")[0];
      return monthOrder.indexOf(am) - monthOrder.indexOf(bm);
    }

    // Approximate timestamp for a bucket key (for gap detection)
    function bucketToTimestamp(key) {
      if (key.startsWith("W")) {
        const week = parseInt(key.slice(1));
        const year = 2000 + parseInt(key.match(/'(\d+)$/)[1]);
        return new Date(year, 0, 1 + (week - 1) * 7).getTime();
      }
      const [mon, yr] = key.split(" '");
      const year = 2000 + parseInt(yr);
      return new Date(year, monthOrder.indexOf(mon), 1).getTime();
    }

    // Build sentiment buckets (only where articles exist)
    const sentBuckets = {};
    for (const [date, row] of Object.entries(sentByDate)) {
      const key = getBucketKey(date);
      if (!sentBuckets[key]) sentBuckets[key] = { sum: 0, count: 0 };
      sentBuckets[key].sum += row.avg_sentiment;
      sentBuckets[key].count += 1;
    }

    // Build return buckets for ALL dates in range
    const retBucketsFull = {};
    for (const row of mktInRange) {
      const key = getBucketKey(row.date);
      if (!retBucketsFull[key]) retBucketsFull[key] = { sum: 0, count: 0 };
      retBucketsFull[key].sum += row.daily_return_pct;
      retBucketsFull[key].count += 1;
    }

    // Shared bucket keys = only buckets where sentiment data exists
    const sharedKeys = Object.keys(sentBuckets).sort(sortBucketKey);

    // Detect gaps: if two consecutive buckets are > 3 months apart, insert a gap marker
    const GAP_THRESHOLD = useWeekly ? 3 * 30 * 86400000 : 180 * 86400000;
    const segments = []; // array of arrays of keys
    let currentSegment = [];

    for (let i = 0; i < sharedKeys.length; i++) {
      if (i === 0) {
        currentSegment.push(sharedKeys[i]);
        continue;
      }
      const prevTs = bucketToTimestamp(sharedKeys[i - 1]);
      const currTs = bucketToTimestamp(sharedKeys[i]);
      if (currTs - prevTs > GAP_THRESHOLD) {
        // Gap detected — close current segment, start new one
        segments.push(currentSegment);
        currentSegment = [sharedKeys[i]];
      } else {
        currentSegment.push(sharedKeys[i]);
      }
    }
    if (currentSegment.length > 0) segments.push(currentSegment);

    // Build the final series with gap markers between segments
    const sentimentSeries = [];
    const returnSeries = [];

    for (let s = 0; s < segments.length; s++) {
      // Add gap marker before segment (except the first)
      if (s > 0) {
        sentimentSeries.push({ date: "___GAP___", sentiment: 0, returnPct: 0 });
        returnSeries.push({ date: "___GAP___", sentiment: 0, returnPct: 0 });
      }
      for (const key of segments[s]) {
        const sb = sentBuckets[key];
        sentimentSeries.push({
          date: key,
          sentiment: sb ? sb.sum / sb.count : 0,
          returnPct: 0,
        });
        const rb = retBucketsFull[key];
        returnSeries.push({
          date: key,
          sentiment: 0,
          returnPct: rb ? rb.sum / rb.count : 0,
        });
      }
    }

    res.json({
      dailyData: sentimentSeries,
      returnData: returnSeries,
      priceSeries,
      correlation,
      accuracy,
      tradingDays,
      meanSentiment,
      meanReturn,
      articles,
      bucketType: useWeekly ? "weekly" : "monthly",
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ════════════════════ PEARSON CORRELATION ════════════════════ */

function pearson(x, y) {
  const n = x.length;
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

/* ════════════════════ START ════════════════════ */

app.listen(PORT, async () => {
  console.log(`\n  NewsAlpha API running on http://localhost:${PORT}`);
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM joined_sentiment_market");
    console.log(`  Database connected: ${rows[0].cnt.toLocaleString()} joined records`);
  } catch (err) {
    console.error(`  ⚠ Database connection failed: ${err.message}`);
  }
  console.log(`  Try: http://localhost:${PORT}/api/analysis?newsSector=XLK&mktSector=XLK\n`);
});