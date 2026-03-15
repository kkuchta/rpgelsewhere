"""
Scrape D&D Beyond content URLs from the official sitemap and upsert into DB.

The sitemap provides a complete, authoritative list of official content URLs.
Unlike Common Crawl, this doesn't include WARC data for edition detection,
so entries are inserted with edition=NULL — any existing edition already in the
database (from prior Common Crawl runs) is preserved.

Usage:
    uv run python -m scripts.scrape_sitemap
    uv run python -m scripts.scrape_sitemap --dry-run
    uv run python -m scripts.scrape_sitemap --categories Spell Monster
"""

import argparse
import re
import xml.etree.ElementTree as ET

import httpx
from sqlalchemy import func
from sqlalchemy.dialects.sqlite import insert

from app.database import SessionLocal, create_tables
from app.models import Entry

SITEMAP_INDEX_URL = "https://www.dndbeyond.com/sitemap.xml"
XML_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# Sitemap type → content category (rpgclass handled separately below)
SITEMAP_CATEGORIES: dict[str, str] = {
    "rpgspell": "Spell",
    "rpgmonster": "Monster",
    "rpgrace": "Species",
    "rpgfeat": "Feat",
    "rpgmagicitem": "Magic Item",
    "rpgbackground": "Background",
}

# The rpgclass sitemap mixes base classes and subclasses under /classes/.
# These slugs identify official base classes; everything else is a subclass.
CLASS_SLUGS = frozenset(
    {
        "barbarian",
        "bard",
        "cleric",
        "druid",
        "fighter",
        "monk",
        "paladin",
        "ranger",
        "rogue",
        "sorcerer",
        "warlock",
        "wizard",
        "blood-hunter",
    }
)


def slug_to_name(slug: str) -> str:
    """Convert 'acid-splash' → 'Acid Splash'."""
    return " ".join(word.capitalize() for word in slug.split("-"))


def extract_slug(url: str) -> str:
    """Extract the slug portion from a URL like '.../spells/1234-acid-splash'."""
    path = url.split("?")[0].rstrip("/")
    segment = path.rsplit("/", 1)[-1]
    return re.sub(r"^\d+-", "", segment)


def classify_class_url(url: str) -> str:
    """Return 'Class' or 'Subclass' for a /classes/ URL."""
    slug = extract_slug(url)
    return "Class" if slug in CLASS_SLUGS else "Subclass"


def fetch_sitemap_index(client: httpx.Client) -> list[tuple[str, str]]:
    """Fetch the sitemap index and return (sitemap_type, url) pairs for RPG content."""
    resp = client.get(SITEMAP_INDEX_URL, timeout=30)
    resp.raise_for_status()
    root = ET.fromstring(resp.content)

    sitemaps: list[tuple[str, str]] = []
    for sitemap in root.findall("sm:sitemap", XML_NS):
        loc = sitemap.findtext("sm:loc", namespaces=XML_NS)
        if not loc:
            continue
        match = re.search(r"sitemap-(rpg\w+)-\d+\.xml", loc)
        if match:
            sitemaps.append((match.group(1), loc))
    return sitemaps


def fetch_sitemap_urls(url: str, client: httpx.Client) -> list[str]:
    """Fetch a single sitemap and return all <loc> URLs."""
    if url.startswith("http://"):
        url = "https://" + url[7:]
    resp = client.get(url, timeout=30)
    resp.raise_for_status()
    root = ET.fromstring(resp.content)
    return [loc.text for loc in root.findall("sm:url/sm:loc", XML_NS) if loc.text]


def upsert_entries(entries: list[dict], db) -> int:
    """Upsert entries, preserving existing edition values."""
    if not entries:
        return 0
    stmt = insert(Entry).values(entries)
    stmt = stmt.on_conflict_do_update(
        index_elements=["url"],
        set_={
            "name": stmt.excluded.name,
            "category": stmt.excluded.category,
            # Keep existing edition when the incoming value is NULL
            "edition": func.coalesce(stmt.excluded.edition, Entry.__table__.c.edition),
        },
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def main():
    parser = argparse.ArgumentParser(
        description="Scrape D&D Beyond URLs from the official sitemap"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print without inserting into DB"
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        metavar="CATEGORY",
        help="Only scrape these categories (e.g. Spell Monster). Case-insensitive.",
    )
    args = parser.parse_args()

    wanted = {c.lower() for c in args.categories} if args.categories else None

    create_tables()

    with httpx.Client() as client:
        print("Fetching sitemap index...")
        sitemap_entries = fetch_sitemap_index(client)
        print(f"Found {len(sitemap_entries)} RPG sitemaps")

        all_entries: list[dict] = []

        for sitemap_type, sitemap_url in sitemap_entries:
            is_class = sitemap_type == "rpgclass"
            category = SITEMAP_CATEGORIES.get(sitemap_type)

            if not category and not is_class:
                continue

            if wanted:
                if is_class:
                    if not ({"class", "subclass"} & wanted):
                        continue
                elif category and category.lower() not in wanted:
                    continue

            label = "Class/Subclass" if is_class else category
            print(f"\nFetching {label} sitemap...")
            urls = fetch_sitemap_urls(sitemap_url, client)

            batch: list[dict] = []
            for url in urls:
                clean_url = url.split("?")[0].rstrip("/")
                if clean_url.startswith("http://"):
                    clean_url = "https://" + clean_url[7:]

                if is_class:
                    entry_category = classify_class_url(clean_url)
                    if wanted and entry_category.lower() not in wanted:
                        continue
                else:
                    entry_category = category

                slug = extract_slug(clean_url)
                name = slug_to_name(slug)

                batch.append(
                    {
                        "name": name,
                        "category": entry_category,
                        "url": clean_url,
                        "edition": None,
                    }
                )

            all_entries.extend(batch)

            if is_class:
                n_class = sum(1 for e in batch if e["category"] == "Class")
                n_sub = sum(1 for e in batch if e["category"] == "Subclass")
                print(f"  {n_class} classes, {n_sub} subclasses")
            else:
                print(f"  {len(batch)} entries")

    print(f"\nTotal entries: {len(all_entries)}")

    if args.dry_run:
        for e in all_entries:
            print(f"  [{e['category']}] {e['name']} → {e['url']}")
        return

    print("Upserting into database...")
    db = SessionLocal()
    try:
        count = upsert_entries(all_entries, db)
        print(f"Done. {count} rows affected.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
