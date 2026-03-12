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
app.use(express.json());

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

app.get("/api/source-coverage", async (req, res) => {
  try {
    // Return which source+sector combos have articles (within valid date range)
    const [rows] = await pool.execute(
      `SELECT source_name, mapped_sector, COUNT(*) as cnt
       FROM articles
       WHERE CAST(SUBSTRING(date, 7, 4) AS UNSIGNED) BETWEEN 2010 AND 2025
       GROUP BY source_name, mapped_sector`
    );

    // Build a map: { source_name: [sector1, sector2, ...] }
    const coverage = {};
    for (const r of rows) {
      if (!coverage[r.source_name]) coverage[r.source_name] = [];
      coverage[r.source_name].push(r.mapped_sector);
    }

    res.json(coverage);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      // Filter to 2010-2025 range to exclude garbage dates (date format: MM-DD-YYYY)
      const [rows] = await pool.execute(
        `SELECT date, AVG(sentiment_score) as avg_sentiment, COUNT(*) as article_count
         FROM articles
         WHERE source_name = ? AND mapped_sector = ?
           AND CAST(SUBSTRING(date, 7, 4) AS UNSIGNED) BETWEEN 2010 AND 2025
         GROUP BY date ORDER BY CAST(SUBSTRING(date, 7, 4) AS UNSIGNED), 
                                CAST(SUBSTRING(date, 1, 2) AS UNSIGNED),
                                CAST(SUBSTRING(date, 4, 2) AS UNSIGNED)`,
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

    /* ── 5. priceSeries: ETF prices with gap-aware trimming ── */
    const sortedMkt = mktRows.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const sentDatesSorted = Object.keys(sentByDate).sort((a, b) => parseDate(a) - parseDate(b));

    const THREE_MONTHS = 90 * 86400000;
    const GAP_THRESHOLD_PRICE = 365 * 86400000; // 12 months

    // Detect clusters of sentiment dates separated by >12 month gaps
    const sentClusters = [];
    let clusterStart = null;
    let clusterEnd = null;

    for (let i = 0; i < sentDatesSorted.length; i++) {
      const t = parseDate(sentDatesSorted[i]);
      if (clusterStart === null) {
        clusterStart = t;
        clusterEnd = t;
      } else if (t - clusterEnd > GAP_THRESHOLD_PRICE) {
        sentClusters.push({ start: clusterStart, end: clusterEnd });
        clusterStart = t;
        clusterEnd = t;
      } else {
        clusterEnd = t;
      }
    }
    if (clusterStart !== null) sentClusters.push({ start: clusterStart, end: clusterEnd });

    // For each cluster, determine the price window:
    // - First cluster: full start to end + 3 months after last sentiment date
    // - Last cluster: 3 months before first sentiment date to full end
    // - Middle clusters: 3 months before to 3 months after
    // - If only 1 cluster: show full range with small padding
    function makePricePoint(p) {
      const sent = sentByDate[p.date];
      const sentiment = sent ? sent.avg_sentiment : null;
      const predicted =
        sentiment !== null
          ? (sentiment >= 0 && p.daily_return_pct >= 0) || (sentiment < 0 && p.daily_return_pct < 0)
          : null;
      return {
        date: formatDateShort(p.date),
        price: p.close_price,
        sentiment,
        returnPct: p.daily_return_pct,
        predicted,
      };
    }

    const priceSeries = [];

    if (sentClusters.length <= 1 && sentClusters.length > 0) {
      // Single cluster — show full range with padding
      const cluster = sentClusters[0];
      const span = cluster.end - cluster.start;
      const pad = Math.max(span * 0.05, 30 * 86400000);
      const filtered = sortedMkt.filter((r) => {
        const t = parseDate(r.date);
        return t >= cluster.start - pad && t <= cluster.end + pad;
      });
      for (const p of filtered) priceSeries.push(makePricePoint(p));
    } else {
      // Multiple clusters — trim each to 3 months context, insert gap markers
      for (let c = 0; c < sentClusters.length; c++) {
        const cluster = sentClusters[c];

        // Determine window for this cluster
        let windowStart, windowEnd;
        if (c === 0) {
          // First cluster: show from data start, trim 3 months after end
          windowStart = cluster.start - Math.max((cluster.end - cluster.start) * 0.05, 30 * 86400000);
          windowEnd = cluster.end + THREE_MONTHS;
        } else if (c === sentClusters.length - 1) {
          // Last cluster: trim 3 months before start, show to data end
          windowStart = cluster.start - THREE_MONTHS;
          windowEnd = cluster.end + Math.max((cluster.end - cluster.start) * 0.05, 30 * 86400000);
        } else {
          // Middle cluster: 3 months on each side
          windowStart = cluster.start - THREE_MONTHS;
          windowEnd = cluster.end + THREE_MONTHS;
        }

        // Insert gap marker between clusters
        if (c > 0) {
          priceSeries.push({
            date: "___GAP___",
            price: 0,
            sentiment: null,
            returnPct: 0,
            predicted: null,
          });
        }

        const filtered = sortedMkt.filter((r) => {
          const t = parseDate(r.date);
          return t >= windowStart && t <= windowEnd;
        });
        for (const p of filtered) priceSeries.push(makePricePoint(p));
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
      // Source-specific: check precomputed source_accuracy table for overall accuracy
      const [srcRows] = await pool.execute(
        "SELECT accuracy, num_days, mean_sentiment FROM source_accuracy WHERE source_name = ?",
        [source]
      );
      if (srcRows[0]) {
        accuracy = srcRows[0].accuracy;
      }

      // Compute correlation, mean sentiment, and mean return from actual matched data
      if (matchedDates.length > 1) {
        const sents = matchedDates.map((d) => sentByDate[d].avg_sentiment);
        const rets = matchedDates.map((d) => mktByDate[d].daily_return_pct);
        correlation = pearson(sents, rets);
        meanSentiment = sents.reduce((a, b) => a + b, 0) / sents.length;
        meanReturn = rets.reduce((a, b) => a + b, 0) / rets.length;
      } else if (matchedDates.length === 1) {
        meanSentiment = sentByDate[matchedDates[0]].avg_sentiment;
        meanReturn = mktByDate[matchedDates[0]].daily_return_pct;
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
    const GAP_THRESHOLD = useWeekly ? 3 * 30 * 86400000 : 365 * 86400000;
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

/* ════════════════════ AI ANALYST (LangChain + Gemini) ════════════════════ */

/*  These endpoints power the AI Analyst page.
 *  They use Google Gemini via LangChain to convert natural language
 *  questions into SQL queries against the MySQL database.
 *
 *  Requires: GOOGLE_API_KEY environment variable
 *  Install:  npm install @langchain/google-genai @langchain/core langchain dotenv
 */

let llm = null;

async function initLLM() {
  try {
    // Dynamic import for ESM LangChain modules
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");

    if (!process.env.GOOGLE_API_KEY) {
      console.log("  ⚠ GOOGLE_API_KEY not set — AI Analyst disabled");
      return;
    }

    llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0,
    });
    console.log("  ✓ AI Analyst ready (Gemini)");
  } catch (err) {
    console.log(`  ⚠ AI Analyst unavailable: ${err.message}`);
  }
}

const MYSQL_SCHEMA = `
Tables in the 'newsalpha' MySQL database:

1. articles (id INT PRIMARY KEY AUTO_INCREMENT, date VARCHAR(20), category VARCHAR(100), sentiment_score DOUBLE, sentiment_label VARCHAR(20), source_name VARCHAR(100), mapped_sector VARCHAR(10))
   - 233,609 rows of news articles with VADER sentiment scores
   - date format: "MM-DD-YYYY"
   - mapped_sector values: ITA, XLF, XLC, PEJ, XLY, XLI, XLK, XLE, XLV, XLP, XLRE, XHB
   - source_name values include: The Guardian, CNN-DailyMail/Other, BBC News, GlobeNewswire, International Business Times, etc.

2. etf_prices (id INT PRIMARY KEY AUTO_INCREMENT, date VARCHAR(20), ticker VARCHAR(10), open_price DOUBLE, close_price DOUBLE, volume BIGINT, daily_return_pct DOUBLE, market_direction VARCHAR(10))
   - 36,656 rows of daily ETF price data
   - date format: "MM-DD-YYYY"
   - ticker values match mapped_sector: ITA, XLF, XLC, PEJ, XLY, XLI, XLK, XLE, XLV, XLP, XLRE, XHB
   - market_direction: "green" (up) or "red" (down)

3. joined_sentiment_market (id INT PRIMARY KEY AUTO_INCREMENT, date VARCHAR(20), sector VARCHAR(10), avg_sentiment DOUBLE, article_count INT, sentiment_std DOUBLE, open_price DOUBLE, close_price DOUBLE, daily_return_pct DOUBLE, market_direction VARCHAR(10), volume BIGINT)
   - 10,080 rows — daily sentiment aggregated and joined with ETF prices on matching trading days

4. prediction_accuracy (sector VARCHAR(10) PRIMARY KEY, accuracy DOUBLE, num_days INT)
   - 12 rows — same-day binary prediction accuracy per sector

5. sector_correlations (sector VARCHAR(10) PRIMARY KEY, correlation DOUBLE, mean_sentiment DOUBLE, mean_return DOUBLE, days INT)
   - 12 rows — Pearson correlation between sentiment and return per sector

6. source_accuracy (source_name VARCHAR(100) PRIMARY KEY, accuracy DOUBLE, num_days INT, mean_sentiment DOUBLE)
   - 11 rows — prediction accuracy per news source

7. cross_sector_correlations (sent_sector VARCHAR(10), mkt_sector VARCHAR(10), correlation DOUBLE, days INT)
   - 132 rows — sentiment-to-return correlations across all sector pairs

8. volatility_correlations (sector VARCHAR(10) PRIMARY KEY, correlation DOUBLE, mean_abs_return DOUBLE, days INT)
   - 12 rows — sentiment vs. absolute return (volatility proxy) correlation per sector
`;

app.post("/api/ask", async (req, res) => {
  try {
    if (!llm) {
      return res.status(503).json({ error: "AI Analyst is not available. Set GOOGLE_API_KEY to enable." });
    }

    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "question is required" });

    const { PromptTemplate } = await import("@langchain/core/prompts");
    const { StringOutputParser } = await import("@langchain/core/output_parsers");

    const prompt = PromptTemplate.fromTemplate(`
You are an expert SQL Generator for MySQL. Given the following MySQL schema:
{schema}

Write a strictly valid MySQL query that answers the user's question.
IMPORTANT RULES:
- Output ONLY the raw SQL query. Do NOT wrap it in markdown formatting.
- Only generate SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, or any other modifying statement.
- Date format in all tables is "MM-DD-YYYY" stored as VARCHAR. To compare dates, use STR_TO_DATE(date, '%m-%d-%Y').
- To extract year: YEAR(STR_TO_DATE(date, '%m-%d-%Y'))
- If the question implies aggregating data, include both the grouping category AND the calculated numeric values in the SELECT clause.
- For joining articles with ETF prices, join on articles.date = etf_prices.date AND articles.mapped_sector = etf_prices.ticker

Question: {question}
SQL Query:
`);

    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    let sql = await chain.invoke({ schema: MYSQL_SCHEMA, question });

    // Clean up markdown formatting
    sql = sql.replace(/^```sql/i, "").replace(/```$/g, "").trim();
    if (sql.startsWith("```")) sql = sql.replace(/^```/, "").replace(/```$/, "").trim();

    if (!sql.toLowerCase().trim().startsWith("select")) {
      return res.status(403).json({
        error: "Generated query was not a SELECT statement for safety.",
        generated_sql: sql,
      });
    }

    res.json({ sql });
  } catch (error) {
    console.error("SQL Generation error:", error.message || error);
    res.status(500).json({ error: "Failed to generate SQL", details: error.message || String(error) });
  }
});

app.post("/api/execute_sql", async (req, res) => {
  try {
    if (!llm) {
      return res.status(503).json({ error: "AI Analyst is not available." });
    }

    const { sql, question } = req.body;
    if (!sql || !question) return res.status(400).json({ error: "sql and question are required" });

    if (!sql.toLowerCase().trim().startsWith("select")) {
      return res.status(403).json({ error: "Only SELECT queries are allowed" });
    }

    // Execute against MySQL
    let rawResult;
    try {
      const [rows] = await pool.execute(sql);
      rawResult = rows;
    } catch (dbErr) {
      return res.status(400).json({ error: "SQL Execution Error", details: dbErr.message });
    }

    // Use LLM to format the answer
    const { PromptTemplate } = await import("@langchain/core/prompts");
    const { StringOutputParser } = await import("@langchain/core/output_parsers");

    const formatPrompt = PromptTemplate.fromTemplate(`
Given the user's original question: "{question}"
And the SQL query executed: "{sql}"
And the JSON result from the database: "{result}"

Provide a concise, natural language answer to the user's question based STRICTLY on the result. Do not mention the SQL query itself. Just answer the question directly. If the result is empty, say no results were found.

OUTPUT FORMAT:
Your final output MUST be a valid JSON object. Do NOT wrap it in markdown. Output raw JSON only.
{{
  "answer": "Concise natural language answer here...",
  "chartConfig": {{
     "type": "bar" | "line" | "pie" | "scatter" | "none",
     "xAxisKey": "column name for x-axis label/category",
     "yAxisKey": "column name for y-axis numeric value"
  }}
}}
If the data is just a single number or cannot be charted logically, set "type" to "none".
`);

    const chain = formatPrompt.pipe(llm).pipe(new StringOutputParser());
    let llmResponse = await chain.invoke({
      question,
      sql,
      result: JSON.stringify(rawResult.slice(0, 50)), // Limit to 50 rows for LLM context
    });

    // Clean up
    llmResponse = llmResponse.replace(/^```json/i, "").replace(/```$/g, "").trim();
    if (llmResponse.startsWith("```")) llmResponse = llmResponse.replace(/^```/, "").replace(/```$/, "").trim();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(llmResponse);
    } catch {
      parsedResponse = { answer: llmResponse, chartConfig: { type: "none" } };
    }

    res.json({
      rawResult: rawResult.slice(0, 100), // Limit rows sent to frontend
      formattedAnswer: parsedResponse.answer,
      chartConfig: parsedResponse.chartConfig || { type: "none" },
    });
  } catch (error) {
    console.error("Execution error:", error);
    res.status(500).json({ error: "Error formatting answer", details: error.message || String(error) });
  }
});

/* ════════════════════ START ════════════════════ */

app.listen(PORT, async () => {
  console.log(`\n  NewsAlpha API running on http://localhost:${PORT}`);
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM joined_sentiment_market");
    console.log(`  Database connected: ${rows[0].cnt.toLocaleString()} joined records`);
  } catch (err) {
    console.error(`  ⚠ Database connection failed: ${err.message}`);
  }
  await initLLM();
  console.log(`  Try: http://localhost:${PORT}/api/analysis?newsSector=XLK&mktSector=XLK\n`);
});