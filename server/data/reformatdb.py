import csv
import os
import shutil
import sqlite3
from collections import defaultdict

DB_PATH = "cs179g_project.db"
SENTIMENT_CSV = "df_clean_trimmed.csv"
MARKET_CSV = "sp500_sector_etf_data.csv"
BACKUP_PATH = "cs179g_project_backup_before_cross_sector_days_rebuild.db"

VALID_SECTORS = {
    "ITA", "XLF", "XLC", "XLY", "XLI", "PEJ",
    "XLV", "XLK", "XLE", "XLP", "XLRE", "XHB"
}

def get_columns(cur, table):
    cur.execute(f'PRAGMA table_info("{table}")')
    return [row[1] for row in cur.fetchall()]

def clean(s):
    if s is None:
        return None
    s = s.strip()
    return s if s else None

def load_sentiment_dates(csv_path):
    sector_dates = defaultdict(set)
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"date", "mapped_sector"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Sentiment CSV missing columns: {sorted(missing)}")

        for row in reader:
            sector = clean(row.get("mapped_sector"))
            date = clean(row.get("date"))
            if sector in VALID_SECTORS and date:
                sector_dates[sector].add(date)
    return sector_dates

def load_market_dates(csv_path):
    ticker_dates = defaultdict(set)
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"date", "ticker"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Market CSV missing columns: {sorted(missing)}")

        for row in reader:
            ticker = clean(row.get("ticker"))
            date = clean(row.get("date"))
            if ticker in VALID_SECTORS and date:
                ticker_dates[ticker].add(date)
    return ticker_dates

def main():
    for path in [DB_PATH, SENTIMENT_CSV, MARKET_CSV]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing file: {path}")

    shutil.copy2(DB_PATH, BACKUP_PATH)
    print(f"Backup created: {BACKUP_PATH}")

    sentiment_dates = load_sentiment_dates(SENTIMENT_CSV)
    market_dates = load_market_dates(MARKET_CSV)

    print("\nSentiment unique dates by sector:")
    for sector in sorted(sentiment_dates):
        print(f"  {sector}: {len(sentiment_dates[sector])}")

    print("\nMarket unique dates by ticker:")
    for ticker in sorted(market_dates):
        print(f"  {ticker}: {len(market_dates[ticker])}")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    try:
        cols = get_columns(cur, "cross_sector_correlations")
        print("\nBefore schema:", cols)

        if "sector_1" in cols and "sent_sector" not in cols:
            cur.execute("""
                ALTER TABLE cross_sector_correlations
                RENAME COLUMN sector_1 TO sent_sector
            """)
            print("Renamed sector_1 -> sent_sector")

        cols = get_columns(cur, "cross_sector_correlations")
        if "sector_2" in cols and "mkt_sector" not in cols:
            cur.execute("""
                ALTER TABLE cross_sector_correlations
                RENAME COLUMN sector_2 TO mkt_sector
            """)
            print("Renamed sector_2 -> mkt_sector")

        cols = get_columns(cur, "cross_sector_correlations")
        if "days" not in cols:
            cur.execute("""
                ALTER TABLE cross_sector_correlations
                ADD COLUMN days INTEGER
            """)
            print("Added days column")

        print("After schema:", get_columns(cur, "cross_sector_correlations"))

        cur.execute("""
            SELECT rowid, sent_sector, mkt_sector
            FROM cross_sector_correlations
        """)
        rows = cur.fetchall()

        updated = 0
        preview = []

        for rowid, sent_sector, mkt_sector in rows:
            sent_set = sentiment_dates.get(sent_sector, set())
            mkt_set = market_dates.get(mkt_sector, set())

            days = len(sent_set & mkt_set)

            cur.execute("""
                UPDATE cross_sector_correlations
                SET days = ?
                WHERE rowid = ?
            """, (days, rowid))

            updated += 1
            if len(preview) < 12:
                preview.append((sent_sector, mkt_sector, days))

        conn.commit()

        print(f"\nUpdated {updated} rows.")
        print("\nSample rebuilt rows:")
        for sent_sector, mkt_sector, days in preview:
            print(f"  {sent_sector} -> {mkt_sector}: {days}")

    except Exception as e:
        conn.rollback()
        print("Failed:", e)
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()