import csv
import sys

csv.field_size_limit(10**8)

input_file = "df_clean.csv"
output_file = "df_clean_trimmed.csv"

keep_cols = [
    "date",
    "category",
    "sentiment_score",
    "sentiment_label",
    "source_name",
    "mapped_sector",
]

valid_sectors = {"ITA","XLF","XLC","XLY","XLI","PEJ","XLV","XLK","XLE","XLP","XLRE","XHB"}

with open(input_file, "r", encoding="utf-8", newline="") as infile, \
     open(output_file, "w", encoding="utf-8", newline="") as outfile:

    reader = csv.DictReader(infile)
    writer = csv.DictWriter(outfile, fieldnames=keep_cols)

    writer.writeheader()
    for row in reader:
        if row["mapped_sector"] in valid_sectors:
            writer.writerow({col: row[col] for col in keep_cols})

print(f"Trimmed CSV written to {output_file}")