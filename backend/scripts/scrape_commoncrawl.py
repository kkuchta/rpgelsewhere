"""
Scrape D&D Beyond content URLs from Common Crawl CDX API and upsert into DB.

Usage:
    uv run python -m scripts.scrape_commoncrawl
    uv run python -m scripts.scrape_commoncrawl --limit 5 --crawls 1
    uv run python -m scripts.scrape_commoncrawl --dry-run
"""

import argparse
import re
import time

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.database import SessionLocal
from app.models import Entry

CDX_API = "https://index.commoncrawl.org/{crawl_id}-index"
COLLINFO_URL = "https://index.commoncrawl.org/collinfo.json"

# Map URL prefix → category name
CONTENT_PREFIXES: list[tuple[str, str]] = [
    ("www.dndbeyond.com/spells/", "Spell"),
    ("www.dndbeyond.com/classes/", "Class"),
    ("www.dndbeyond.com/subclasses/", "Subclass"),
    ("www.dndbeyond.com/species/", "Species"),
    ("www.dndbeyond.com/races/", "Species"),
    ("www.dndbeyond.com/monsters/", "Monster"),
    ("www.dndbeyond.com/magic-items/", "Magic Item"),
    ("www.dndbeyond.com/equipment/", "Equipment"),
    ("www.dndbeyond.com/feats/", "Feat"),
    ("www.dndbeyond.com/backgrounds/", "Background"),
]

# Match /{category}/{numeric_id}-{slug} — rejects list pages and query-param variants
SLUG_PATTERN = re.compile(r"/\d+-[a-z0-9-]+$")


def slug_to_name(slug: str) -> str:
    """Convert 'acid-splash' → 'Acid Splash'."""
    return " ".join(word.capitalize() for word in slug.split("-"))


def extract_name_from_url(url: str) -> str:
    """Extract slug portion and convert to title-case name."""
    path = url.split("?")[0].rstrip("/")
    segment = path.rsplit("/", 1)[-1]
    # Strip leading numeric ID: "12345-acid-splash" → "acid-splash"
    slug = re.sub(r"^\d+-", "", segment)
    return slug_to_name(slug)


def get_recent_crawl_ids(n: int, client: httpx.Client) -> list[str]:
    resp = client.get(COLLINFO_URL, timeout=30)
    resp.raise_for_status()
    crawls = resp.json()
    # List is newest-first
    return [c["id"] for c in crawls[:n]]


def query_cdx(
    crawl_id: str, url_prefix: str, limit: int | None, client: httpx.Client
) -> list[dict]:
    params = {
        "url": f"{url_prefix}*",
        "output": "json",
        "fl": "url,status",
        "filter": "status:200",
        "collapse": "urlkey",
    }
    if limit is not None:
        params["limit"] = str(limit)

    api_url = CDX_API.format(crawl_id=crawl_id)
    resp = client.get(api_url, params=params, timeout=60)
    if resp.status_code == 404:
        return []
    resp.raise_for_status()

    results = []
    for line in resp.text.strip().splitlines():
        if not line:
            continue
        try:
            import json

            record = json.loads(line)
            results.append(record)
        except Exception:
            continue
    return results


def upsert_entries(entries: list[dict], db) -> int:
    if not entries:
        return 0
    stmt = insert(Entry).values(entries)
    stmt = stmt.on_conflict_do_update(
        index_elements=["url"],
        set_={"name": stmt.excluded.name, "category": stmt.excluded.category},
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def main():
    parser = argparse.ArgumentParser(
        description="Scrape D&D Beyond URLs from Common Crawl"
    )
    parser.add_argument(
        "--limit", type=int, default=None, help="Max results per category per crawl"
    )
    parser.add_argument(
        "--crawls", type=int, default=10, help="Number of recent crawls to search"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print without inserting into DB"
    )
    args = parser.parse_args()

    print(f"Fetching {args.crawls} recent crawl IDs...")
    with httpx.Client() as client:
        crawl_ids = get_recent_crawl_ids(args.crawls, client)
        print(f"Crawls: {crawl_ids}")

        # Collect all entries, deduplicated by URL
        seen_urls: dict[str, dict] = {}

        for crawl_id in crawl_ids:
            print(f"\n--- Crawl: {crawl_id} ---")
            for prefix, category in CONTENT_PREFIXES:
                print(f"  Querying {category} ({prefix})...", end=" ", flush=True)
                try:
                    records = query_cdx(crawl_id, prefix, args.limit, client)
                except httpx.HTTPError as e:
                    print(f"ERROR: {e}")
                    continue

                count = 0
                for record in records:
                    url: str = record.get("url", "")
                    # Strip query params
                    clean_url = url.split("?")[0].rstrip("/")
                    if "/" in clean_url:
                        path = "/" + clean_url.split("/", 3)[-1]
                    else:
                        path = clean_url

                    # Only keep URLs matching /{segment}/{numeric_id}-{slug}
                    if not SLUG_PATTERN.search(path):
                        continue

                    # Use https canonical form
                    if not clean_url.startswith("http"):
                        clean_url = "https://" + clean_url
                    elif clean_url.startswith("http://"):
                        clean_url = "https://" + clean_url[7:]

                    if clean_url not in seen_urls:
                        name = extract_name_from_url(clean_url)
                        seen_urls[clean_url] = {
                            "name": name,
                            "category": category,
                            "url": clean_url,
                        }
                        count += 1

                print(f"{count} new entries")
                time.sleep(1.5)

    entries = list(seen_urls.values())
    print(f"\nTotal unique entries collected: {len(entries)}")

    if args.dry_run:
        for e in entries[:20]:
            print(f"  [{e['category']}] {e['name']} → {e['url']}")
        if len(entries) > 20:
            print(f"  ... and {len(entries) - 20} more")
        return

    print("Upserting into database...")
    db = SessionLocal()
    try:
        count = upsert_entries(entries, db)
        print(f"Done. {count} rows affected.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
