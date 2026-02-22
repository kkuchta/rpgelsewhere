"""
Scrape D&D Beyond content URLs from Common Crawl CDX API and upsert into DB.

Usage:
    uv run python -m scripts.scrape_commoncrawl
    uv run python -m scripts.scrape_commoncrawl --limit 5 --crawls 1
    uv run python -m scripts.scrape_commoncrawl --dry-run
    uv run python -m scripts.scrape_commoncrawl --skip-warc
"""

import argparse
import re
import time

import httpx
from sqlalchemy.dialects.postgresql import insert
from warcio.archiveiterator import ArchiveIterator

from app.database import SessionLocal
from app.models import Entry

CDX_API = "https://index.commoncrawl.org/{crawl_id}-index"
COLLINFO_URL = "https://index.commoncrawl.org/collinfo.json"
WARC_BASE = "https://data.commoncrawl.org"

# D&D Beyond banner text present on all legacy (2014) content pages
LEGACY_BANNER_TEXT = "doesn't reflect the latest rules and lore"

# Marker present on homebrew content pages but not on official content
HOMEBREW_MARKER = 'class="i-homebrew"'

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
        "fl": "url,status,filename,offset,length",
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


def fetch_warc_content(
    filename: str, offset: int, length: int, client: httpx.Client
) -> str | None:
    """Fetch a WARC record HTML body from Common Crawl S3 via an HTTP Range request."""
    s3_url = f"{WARC_BASE}/{filename}"
    byte_range = f"bytes={offset}-{offset + length - 1}"
    try:
        with client.stream(
            "GET",
            s3_url,
            headers={"Range": byte_range},
            timeout=30,
        ) as resp:
            if resp.status_code != 206:
                return None
            raw = resp.read()

        import io

        stream = ArchiveIterator(io.BytesIO(raw))
        for warc_record in stream:
            if warc_record.rec_type == "response":
                content_bytes = warc_record.content_stream().read()
                try:
                    return content_bytes.decode("utf-8", errors="replace")
                except Exception:
                    return None
    except Exception as e:
        print(f"    WARC fetch error ({filename}): {e}")
    return None


def is_homebrew(html: str) -> bool:
    """Return True if the page is user-created homebrew content."""
    return HOMEBREW_MARKER in html


def detect_edition(html: str) -> str:
    """Return 'legacy' if the page has the 2014 legacy banner, otherwise '2024'."""
    if LEGACY_BANNER_TEXT in html:
        return "legacy"
    return "2024"


def upsert_entries(entries: list[dict], db) -> int:
    if not entries:
        return 0
    stmt = insert(Entry).values(entries)
    stmt = stmt.on_conflict_do_update(
        index_elements=["url"],
        set_={
            "name": stmt.excluded.name,
            "category": stmt.excluded.category,
            "edition": stmt.excluded.edition,
        },
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
    parser.add_argument(
        "--skip-warc",
        action="store_true",
        help="Skip WARC fetching — edition will be NULL for all entries",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        metavar="CATEGORY",
        help="Only scrape these categories (e.g. Class Species). Case-insensitive.",
    )
    args = parser.parse_args()

    # Build the active prefix list, optionally filtered by --categories
    active_prefixes = CONTENT_PREFIXES
    if args.categories:
        wanted = {c.lower() for c in args.categories}
        active_prefixes = [(p, c) for p, c in CONTENT_PREFIXES if c.lower() in wanted]
        if not active_prefixes:
            known = ", ".join(sorted({c for _, c in CONTENT_PREFIXES}))
            parser.error(f"No matching categories found. Known categories: {known}")

    print(f"Fetching {args.crawls} recent crawl IDs...")
    with httpx.Client() as client:
        crawl_ids = get_recent_crawl_ids(args.crawls, client)
        print(f"Crawls: {crawl_ids}")

        # Collect all entries, deduplicated by URL, retaining WARC location metadata
        seen_urls: dict[str, dict] = {}

        for crawl_id in crawl_ids:
            print(f"\n--- Crawl: {crawl_id} ---")
            for prefix, category in active_prefixes:
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
                            "edition": None,
                            "_warc_filename": record.get("filename"),
                            "_warc_offset": int(record.get("offset") or 0),
                            "_warc_length": int(record.get("length") or 0),
                        }
                        count += 1

                print(f"{count} new entries")
                time.sleep(1.5)

        # Second pass: fetch WARC content, filter homebrew, and detect edition
        if not args.skip_warc:
            total = len(seen_urls)
            print(f"\nFetching WARC records to detect edition ({total} entries)...")
            homebrew_urls: list[str] = []
            for i, (url, entry) in enumerate(seen_urls.items(), 1):
                filename = entry.get("_warc_filename")
                offset = entry.get("_warc_offset", 0)
                length = entry.get("_warc_length", 0)

                if not filename or not length:
                    print(f"  [{i}/{total}] SKIP (no WARC metadata): {url}")
                    continue

                print(f"  [{i}/{total}] {url}", end=" ... ", flush=True)
                html = fetch_warc_content(filename, offset, length, client)
                if html is not None:
                    if is_homebrew(html):
                        print("SKIP (homebrew)")
                        homebrew_urls.append(url)
                    else:
                        entry["edition"] = detect_edition(html)
                        print(entry["edition"])
                else:
                    print("fetch failed, edition=None")

                time.sleep(0.5)

            for url in homebrew_urls:
                seen_urls.pop(url, None)
            if homebrew_urls:
                print(f"Filtered {len(homebrew_urls)} homebrew entries.")
        else:
            print(
                "\nSkipping WARC fetches (--skip-warc). Edition will be NULL. "
                "Note: homebrew filtering is disabled when --skip-warc is used."
            )

    # Strip internal WARC metadata keys before upserting
    entries = [
        {k: v for k, v in entry.items() if not k.startswith("_")}
        for entry in seen_urls.values()
    ]
    print(f"\nTotal unique entries collected: {len(entries)}")

    if args.dry_run:
        for e in entries[:20]:
            edition_label = f" [{e['edition']}]" if e.get("edition") else ""
            print(f"  [{e['category']}]{edition_label} {e['name']} → {e['url']}")
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
