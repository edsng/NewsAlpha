/**
 *  migrate-to-mysql.js
 *  ─────────────────────────────────────────────
 *  Migrates all data into MySQL from:
 *    - cs179g_project.db (SQLite — 10 precomputed analysis tables)
 *    - df_clean_trimmed.csv (233,609 articles with source_name)
 *    - sp500_sector_etf_data.csv (36,656 ETF price records)
 *
 *  Usage:
 *    node migrate-to-mysql.js
 *
 *  Prerequisites:
 *    1. MySQL running locally
 *    2. Create the database first:
 *       mysql -u root -p -e "CREATE DATABASE newsalpha;"
 *    3. npm install (dependencies in package.json)
 *
 *  Configure connection below or via env vars.
 */

const mysql = require("mysql2/promise");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

/* ════════════════════ CONFIG ════════════════════ */

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "newsalpha",
  multipleStatements: true,
};

const DATA_DIR = path.join(__dirname, "data");
const SQLITE_PATH = path.join(DATA_DIR, "cs179g_project.db");
const ARTICLES_CSV = path.join(DATA_DIR, "df_clean_trimmed.csv");
const ETF_CSV = path.join(DATA_DIR, "sp500_sector_etf_data.csv");

/* ════════════════════ HELPERS ════════════════════ */

function parseCSV(filepath) {
  const raw = fs.readFileSync(filepath, "utf-8");
  const lines = raw.trim().split("\n");
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse — works for our files (no commas in values)
    const cols = lines[i].split(",");
    const obj = {};
    header.forEach((h, idx) => (obj[h.trim()] = cols[idx]?.trim() ?? ""));
    rows.push(obj);
  }
  return { header, rows };
}

/* ════════════════════ MAIN ════════════════════ */

async function migrate() {
  console.log("\n═══════════════════════════════════════");
  console.log("  NewsAlpha — MySQL Migration");
  console.log("═══════════════════════════════════════\n");

  const conn = await mysql.createConnection(MYSQL_CONFIG);
  console.log(`✓ Connected to MySQL (${MYSQL_CONFIG.host}/${MYSQL_CONFIG.database})\n`);

  /* ── 1. Create tables ── */
  console.log(">>> Creating tables...");

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS joined_sentiment_market (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(20),
      sector VARCHAR(10),
      avg_sentiment DOUBLE,
      article_count INT,
      sentiment_std DOUBLE,
      open_price DOUBLE,
      close_price DOUBLE,
      daily_return_pct DOUBLE,
      market_direction VARCHAR(10),
      volume BIGINT,
      INDEX idx_sector (sector),
      INDEX idx_date (date),
      INDEX idx_sector_date (sector, date)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS prediction_accuracy (
      sector VARCHAR(10) PRIMARY KEY,
      accuracy DOUBLE,
      num_days INT
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS sector_correlations (
      sector VARCHAR(10) PRIMARY KEY,
      correlation DOUBLE,
      mean_sentiment DOUBLE,
      mean_return DOUBLE,
      days INT
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS next_day_accuracy (
      sector VARCHAR(10) PRIMARY KEY,
      next_day_accuracy DOUBLE,
      days INT
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS next_day_correlations (
      sector VARCHAR(10) PRIMARY KEY,
      next_day_corr DOUBLE
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS cross_sector_correlations (
      sent_sector VARCHAR(10),
      mkt_sector VARCHAR(10),
      correlation DOUBLE,
      days INT,
      PRIMARY KEY (sent_sector, mkt_sector)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS cross_sector_prediction_accuracy (
      sent_sector VARCHAR(10),
      mkt_sector VARCHAR(10),
      accuracy DOUBLE,
      days INT,
      PRIMARY KEY (sent_sector, mkt_sector)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS cross_sector_prediction (
      sent_sector VARCHAR(10),
      mkt_sector VARCHAR(10),
      correlation DOUBLE,
      days INT,
      PRIMARY KEY (sent_sector, mkt_sector)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS source_accuracy (
      source_name VARCHAR(100) PRIMARY KEY,
      accuracy DOUBLE,
      num_days INT,
      mean_sentiment DOUBLE
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS volatility_correlations (
      sector VARCHAR(10) PRIMARY KEY,
      correlation DOUBLE,
      days INT
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(20),
      category VARCHAR(100),
      sentiment_score DOUBLE,
      sentiment_label VARCHAR(20),
      source_name VARCHAR(100),
      mapped_sector VARCHAR(10),
      INDEX idx_sector (mapped_sector),
      INDEX idx_source (source_name),
      INDEX idx_date (date),
      INDEX idx_source_sector (source_name, mapped_sector)
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS etf_prices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(20),
      ticker VARCHAR(10),
      open_price DOUBLE,
      close_price DOUBLE,
      volume BIGINT,
      daily_return_pct DOUBLE,
      market_direction VARCHAR(10),
      INDEX idx_ticker (ticker),
      INDEX idx_date (date),
      INDEX idx_ticker_date (ticker, date)
    )
  `);

  console.log("  ✓ All tables created\n");

  /* ── 2. Migrate SQLite tables ── */
  console.log(">>> Migrating SQLite tables...");
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  const sqliteTables = [
    {
      from: "joined_sentiment_market",
      to: "joined_sentiment_market",
      cols: "date, sector, avg_sentiment, article_count, sentiment_std, `open`, `close`, daily_return_pct, market_direction, volume",
      insert: "date, sector, avg_sentiment, article_count, sentiment_std, open_price, close_price, daily_return_pct, market_direction, volume",
      placeholders: 10,
    },
    {
      from: "prediction_accuracy",
      to: "prediction_accuracy",
      cols: "sector, accuracy, num_days",
      insert: "sector, accuracy, num_days",
      placeholders: 3,
    },
    {
      from: "sector_correlations",
      to: "sector_correlations",
      cols: "sector, correlation, mean_sentiment, mean_return, days",
      insert: "sector, correlation, mean_sentiment, mean_return, days",
      placeholders: 5,
    },
    {
      from: "next_day_accuracy",
      to: "next_day_accuracy",
      cols: "sector, next_day_accuracy, days",
      insert: "sector, next_day_accuracy, days",
      placeholders: 3,
    },
    {
      from: "next_day_correlations",
      to: "next_day_correlations",
      cols: "sector, next_day_corr",
      insert: "sector, next_day_corr",
      placeholders: 2,
    },
    {
      from: "cross_sector_correlations",
      to: "cross_sector_correlations",
      cols: "sent_sector, mkt_sector, correlation, days",
      insert: "sent_sector, mkt_sector, correlation, days",
      placeholders: 4,
    },
    {
      from: "cross_sector_prediction_accuracy",
      to: "cross_sector_prediction_accuracy",
      cols: "sent_sector, mkt_sector, accuracy, days",
      insert: "sent_sector, mkt_sector, accuracy, days",
      placeholders: 4,
    },
    {
      from: "cross_sector_prediction",
      to: "cross_sector_prediction",
      cols: "sent_sector, mkt_sector, correlation, days",
      insert: "sent_sector, mkt_sector, correlation, days",
      placeholders: 4,
    },
    {
      from: "source_accuracy",
      to: "source_accuracy",
      cols: "source_name, accuracy, num_days, mean_sentiment",
      insert: "source_name, accuracy, num_days, mean_sentiment",
      placeholders: 4,
    },
    {
      from: "volatility_correlations",
      to: "volatility_correlations",
      cols: "sector, correlation, days",
      insert: "sector, correlation, days",
      placeholders: 3,
    },
  ];

  for (const table of sqliteTables) {
    const rows = sqlite.prepare(`SELECT ${table.cols} FROM ${table.from}`).all();
    if (rows.length === 0) {
      console.log(`  ⚠ ${table.from}: 0 rows, skipping`);
      continue;
    }

    // Clear existing data
    await conn.execute(`DELETE FROM ${table.to}`);

    // Batch insert
    const ph = Array(table.placeholders).fill("?").join(", ");
    const sql = `INSERT INTO ${table.to} (${table.insert}) VALUES (${ph})`;

    const BATCH = 1000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values = batch.map((r) => Object.values(r));
      await Promise.all(values.map((v) => conn.execute(sql, v)));
    }

    console.log(`  ✓ ${table.to}: ${rows.length} rows`);
  }

  sqlite.close();

  /* ── 3. Import articles CSV ── */
  console.log("\n>>> Importing articles from df_clean_trimmed.csv...");
  await conn.execute("DELETE FROM articles");

  const articles = parseCSV(ARTICLES_CSV);
  const artSql = "INSERT INTO articles (date, category, sentiment_score, sentiment_label, source_name, mapped_sector) VALUES (?, ?, ?, ?, ?, ?)";

  const BATCH = 1000;
  for (let i = 0; i < articles.rows.length; i += BATCH) {
    const batch = articles.rows.slice(i, i + BATCH);
    await Promise.all(
      batch.map((r) =>
        conn.execute(artSql, [
          r.date,
          r.category,
          parseFloat(r.sentiment_score),
          r.sentiment_label,
          r.source_name,
          r.mapped_sector,
        ])
      )
    );
    if ((i + BATCH) % 50000 < BATCH) {
      console.log(`  ... ${Math.min(i + BATCH, articles.rows.length).toLocaleString()} / ${articles.rows.length.toLocaleString()}`);
    }
  }
  console.log(`  ✓ articles: ${articles.rows.length.toLocaleString()} rows\n`);

  /* ── 4. Import ETF prices CSV ── */
  console.log(">>> Importing ETF prices from sp500_sector_etf_data.csv...");
  await conn.execute("DELETE FROM etf_prices");

  const etf = parseCSV(ETF_CSV);
  const etfSql = "INSERT INTO etf_prices (date, ticker, open_price, close_price, volume, daily_return_pct, market_direction) VALUES (?, ?, ?, ?, ?, ?, ?)";

  for (let i = 0; i < etf.rows.length; i += BATCH) {
    const batch = etf.rows.slice(i, i + BATCH);
    await Promise.all(
      batch.map((r) =>
        conn.execute(etfSql, [
          r.date,
          r.ticker,
          parseFloat(r.open),
          parseFloat(r.close),
          parseInt(r.volume),
          parseFloat(r.daily_return_pct),
          r.market_direction,
        ])
      )
    );
  }
  console.log(`  ✓ etf_prices: ${etf.rows.length.toLocaleString()} rows\n`);

  /* ── 5. Verify ── */
  console.log(">>> Verification:");
  const tables = [
    "joined_sentiment_market", "prediction_accuracy", "sector_correlations",
    "next_day_accuracy", "next_day_correlations", "cross_sector_correlations",
    "cross_sector_prediction_accuracy", "cross_sector_prediction",
    "source_accuracy", "volatility_correlations", "articles", "etf_prices",
  ];
  for (const t of tables) {
    const [rows] = await conn.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`  ${t}: ${rows[0].cnt.toLocaleString()} rows`);
  }

  await conn.end();
  console.log("\n═══════════════════════════════════════");
  console.log("  Migration complete!");
  console.log("═══════════════════════════════════════\n");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
