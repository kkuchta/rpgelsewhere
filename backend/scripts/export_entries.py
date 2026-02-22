"""
Export the DB entries merged with overrides to a static JSON file for the frontend.

Usage:
    uv run python -m scripts.export_entries
    uv run python -m scripts.export_entries --overrides ../../data/overrides.csv
    uv run python -m scripts.export_entries --out ../../frontend/public/entries.json
"""

import argparse
import csv
import json
from pathlib import Path

from app.database import SessionLocal
from app.models import Entry

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OVERRIDES = REPO_ROOT / "data" / "overrides.csv"
DEFAULT_OUT = REPO_ROOT / "frontend" / "public" / "entries.json"

VALID_ACTIONS = {"add", "update", "delete"}


def load_entries_from_db() -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.query(Entry).order_by(Entry.name).all()
        return [
            {
                "name": row.name,
                "category": row.category,
                "url": row.url,
                "edition": row.edition,
            }
            for row in rows
        ]
    finally:
        db.close()


def load_overrides(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [row for row in reader if row.get("action", "").strip() in VALID_ACTIONS]


def apply_overrides(entries: list[dict], overrides: list[dict]) -> list[dict]:
    by_url: dict[str, dict] = {e["url"]: e for e in entries}

    for row in overrides:
        action = row["action"].strip()
        url = row["url"].strip()

        if action == "delete":
            by_url.pop(url, None)

        elif action == "add":
            by_url[url] = {
                "name": row["name"].strip(),
                "category": row["category"].strip(),
                "url": url,
                "edition": row["edition"].strip() or None,
            }

        elif action == "update":
            if url in by_url:
                entry = by_url[url]
                if row["name"].strip():
                    entry["name"] = row["name"].strip()
                if row["category"].strip():
                    entry["category"] = row["category"].strip()
                if row["edition"].strip():
                    entry["edition"] = row["edition"].strip()
            else:
                # URL not in DB — treat as an add
                by_url[url] = {
                    "name": row["name"].strip(),
                    "category": row["category"].strip(),
                    "url": url,
                    "edition": row["edition"].strip() or None,
                }

    return sorted(by_url.values(), key=lambda e: e["name"].lower())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export DB entries + CSV overrides to entries.json"
    )
    parser.add_argument(
        "--overrides",
        type=Path,
        default=DEFAULT_OVERRIDES,
        help=f"Path to overrides CSV (default: {DEFAULT_OVERRIDES})",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help=f"Output JSON path (default: {DEFAULT_OUT})",
    )
    args = parser.parse_args()

    print("Loading entries from database...")
    entries = load_entries_from_db()
    print(f"  {len(entries)} entries loaded")

    print(f"Loading overrides from {args.overrides}...")
    overrides = load_overrides(args.overrides)
    print(f"  {len(overrides)} overrides found")

    merged = apply_overrides(entries, overrides)
    print(f"  {len(merged)} entries after applying overrides")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Written to {args.out}")


if __name__ == "__main__":
    main()
