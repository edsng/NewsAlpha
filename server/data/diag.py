import csv
from collections import Counter

csv.field_size_limit(10**8)

input_file = "df_clean.csv"

def check_csv(path):
    total_rows = 0
    corrupt_rows = 0
    missing_required = 0
    field_count_mismatch = 0

    corrupt_examples = []
    required_cols = [
        "date",
        "category",
        "sentiment_score",
        "sentiment_label",
        "source_name",
        "mapped_sector",
    ]

    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(
            f,
            escapechar="\\",
        )

        header = reader.fieldnames
        print("Header columns:", header)

        if not header:
            print("ERROR: No header detected.")
            return

        missing_from_header = [c for c in required_cols if c not in header]
        if missing_from_header:
            print("Missing required header columns:", missing_from_header)

        for i, row in enumerate(reader, start=2):  # line 1 = header
            total_rows += 1

            row_is_corrupt = False
            reasons = []

            # DictReader puts extra columns under key None
            if None in row:
                field_count_mismatch += 1
                row_is_corrupt = True
                reasons.append("extra columns detected")

            # Missing columns may appear as None values
            missing_cols = [k for k in required_cols if row.get(k) is None]
            if missing_cols:
                missing_required += 1
                row_is_corrupt = True
                reasons.append(f"missing required columns: {missing_cols}")

            if row_is_corrupt:
                corrupt_rows += 1
                if len(corrupt_examples) < 10:
                    corrupt_examples.append({
                        "csv_row_number": i,
                        "reasons": reasons,
                        "sample": row
                    })

    print("\n=== CSV CHECK RESULTS ===")
    print("Total parsed data rows:", total_rows)
    print("Corrupt rows:", corrupt_rows)
    print("Rows with field count mismatch:", field_count_mismatch)
    print("Rows missing required columns:", missing_required)

    if corrupt_examples:
        print("\nSample corrupt rows:")
        for ex in corrupt_examples:
            print(f"\nRow {ex['csv_row_number']}: {ex['reasons']}")
            print(ex["sample"])
    else:
        print("\nNo corrupt rows detected by native Python CSV parsing.")

check_csv(input_file)