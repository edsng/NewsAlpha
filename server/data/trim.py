import csv
import sys

csv.field_size_limit(10**8)

input_file = "df_clean.csv"
output_file = "df_clean_trimmed_test.csv"

keep_cols = [
    "date",
    "category",
    "sentiment_score",
    "sentiment_label",
    "source_name",
    "mapped_sector",
]

valid_sectors = {"ITA", "XLF", "XLC", "XLY", "XLI", "PEJ", "XLV", "XLK", "XLE", "XLP", "XLRE", "XHB"}

with open(input_file, "r", encoding="utf-8", newline="") as infile, \
     open(output_file, "w", encoding="utf-8", newline="") as outfile:

    # Native Python equivalent of Spark-style CSV loading:
    # - header=True         -> DictReader uses first row as header
    # - multiLine=True      -> handled by csv module when newline="" is used
    # - escape='\\'         -> escapechar="\\"
    reader = csv.DictReader(infile, escapechar="\\")
    writer = csv.DictWriter(outfile, fieldnames=keep_cols)

    if not reader.fieldnames:
        raise ValueError("No CSV header detected in input file.")

    missing_cols = [col for col in keep_cols if col not in reader.fieldnames]
    if missing_cols:
        raise ValueError(f"Missing required columns in input CSV: {missing_cols}")

    writer.writeheader()
    rows_written = 0

    for row_num, row in enumerate(reader, start=2):
        if None in row:
            raise ValueError(f"Corrupt row detected at CSV row {row_num}: extra columns found.")

        if row.get("mapped_sector") in valid_sectors:
            writer.writerow({col: row[col] for col in keep_cols})
            rows_written += 1

print(f"Trimmed CSV written to {output_file}")
print(f"Rows written: {rows_written}")