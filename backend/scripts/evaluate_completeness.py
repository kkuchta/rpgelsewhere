"""
Compare our entries.json against the 5e SRD JSON data from GitHub to evaluate
dataset completeness. Fetches raw JSON from 5e-bits/5e-database and reports
per-category coverage.

Usage:
    uv run python -m scripts.evaluate_completeness
    uv run python -m scripts.evaluate_completeness \
        --entries ../../frontend/public/entries.json
    uv run python -m scripts.evaluate_completeness --edition legacy
"""

import argparse
import json
from pathlib import Path

import httpx

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENTRIES = REPO_ROOT / "frontend" / "public" / "entries.json"

SRD_BASE_URL = "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014"

# Maps (SRD filename stem, our category name)
CATEGORY_MAP: list[tuple[str, str]] = [
    ("5e-SRD-Spells", "Spell"),
    ("5e-SRD-Monsters", "Monster"),
    ("5e-SRD-Classes", "Class"),
    ("5e-SRD-Subclasses", "Subclass"),
    ("5e-SRD-Races", "Species"),
    ("5e-SRD-Equipment", "Equipment"),
    ("5e-SRD-Magic-Items", "Magic Item"),
    ("5e-SRD-Feats", "Feat"),
    ("5e-SRD-Backgrounds", "Background"),
]


def fetch_srd(filename: str, client: httpx.Client) -> list[dict]:
    url = f"{SRD_BASE_URL}/{filename}.json"
    resp = client.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def normalize(name: str) -> str:
    return name.strip().lower()


def load_entries(path: Path, edition_filter: str | None) -> dict[str, set[str]]:
    """Return {category: set of normalized names} from entries.json."""
    with path.open(encoding="utf-8") as f:
        entries = json.load(f)

    by_category: dict[str, set[str]] = {}
    for entry in entries:
        if edition_filter and entry.get("edition") != edition_filter:
            continue
        cat = entry["category"]
        by_category.setdefault(cat, set()).add(normalize(entry["name"]))
    return by_category


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Evaluate dataset completeness against the 5e SRD"
    )
    parser.add_argument(
        "--entries",
        type=Path,
        default=DEFAULT_ENTRIES,
        help=f"Path to entries.json (default: {DEFAULT_ENTRIES})",
    )
    parser.add_argument(
        "--edition",
        choices=["legacy", "2024"],
        default=None,
        help="Only consider our entries with this edition (default: all editions)",
    )
    args = parser.parse_args()

    print(f"Loading entries from {args.entries}...")
    our_entries = load_entries(args.entries, args.edition)
    total_our = sum(len(v) for v in our_entries.values())
    edition_note = f" (edition={args.edition})" if args.edition else ""
    print(f"  {total_our} entries loaded{edition_note}\n")

    results: list[tuple[str, int, int, list[str]]] = []

    with httpx.Client() as client:
        for filename, category in CATEGORY_MAP:
            print(f"Fetching SRD {category}...")
            srd_entries = fetch_srd(filename, client)
            srd_names = [e["name"] for e in srd_entries]
            srd_total = len(srd_names)

            our_set = our_entries.get(category, set())
            missing = [n for n in srd_names if normalize(n) not in our_set]
            covered = srd_total - len(missing)

            results.append((category, covered, srd_total, missing))

    print("\n" + "=" * 50)
    print("SRD Coverage Report")
    if args.edition:
        print(f"(comparing against edition={args.edition} entries only)")
    print("=" * 50 + "\n")

    col_w = max(len(cat) for cat, *_ in results)
    for category, covered, total, _ in results:
        pct = (covered / total * 100) if total else 0.0
        bar = f"{covered:>4} / {total:<4}  ({pct:5.1f}%)"
        print(f"  {category:<{col_w}}  {bar}")

    print()

    for category, covered, total, missing in results:
        if not missing:
            continue
        print(f"--- Missing {category} ({len(missing)}) ---")
        for name in missing:
            print(f"  {name}")
        print()


if __name__ == "__main__":
    main()
