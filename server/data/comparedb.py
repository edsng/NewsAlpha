import sqlite3

DB = "cs179g_project.db"
tables = [
    "cross_sector_correlations",
    "cross_sector_prediction_accuracy",
    "cross_sector_prediction",
    "volatility_correlations",
]

conn = sqlite3.connect(DB)
cur = conn.cursor()

for table in tables:
    print(f"\n=== {table} ===")
    cur.execute(f'PRAGMA table_info("{table}")')
    cols = cur.fetchall()
    for c in cols:
        print(c[1], "|", c[2])

conn.close()