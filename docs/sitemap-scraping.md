# D&D Beyond Sitemap Scraping

## Overview

D&D Beyond publishes a [sitemap index](https://www.dndbeyond.com/sitemap.xml) linking to per-category sub-sitemaps for all official content. The sitemap scraper (`scripts/scrape_sitemap.py`) fetches these XML files for a complete URL list — much faster and more reliable than Common Crawl alone.

```bash
just scrape-sitemap              # scrape all categories
just scrape-sitemap -- --dry-run # preview without writing to DB
```

## Sitemap structure

The index links to sub-sitemaps named `sitemap-rpg{type}-{n}.xml`:

| Sitemap | Category | Notes |
|---------|----------|-------|
| `rpgspell` | Spell | |
| `rpgmonster` | Monster | |
| `rpgclass` | Class + Subclass | Mixed; see below |
| `rpgrace` | Species | |
| `rpgfeat` | Feat | |
| `rpgmagicitem` | Magic Item | |
| `rpgbackground` | Background | |

Equipment has no sitemap and still depends on Common Crawl.

## Class vs. subclass

The `rpgclass` sitemap mixes both under `/classes/`. The scraper uses a curated `CLASS_SLUGS` set (the 12 PHB classes + Blood Hunter) — any slug not in the set is categorized as Subclass. New base classes would need to be added to this set.

## Homebrew and edition

**Homebrew** is not an issue — the sitemap only lists official content.

**Edition** is not available from the sitemap. Entries are inserted with `edition=NULL`, and the upsert uses `COALESCE(excluded.edition, entries.edition)` to preserve any edition already set by Common Crawl.

## Gotcha: `content-disposition: attachment`

The sitemap endpoint returns `content-disposition: attachment`, which causes some HTTP clients to fail or download the file rather than parse it. `httpx` handles this fine.

## Workflow

Running `just scrape` does both scrapers automatically (sitemap first for URLs, then Common Crawl for edition detection).
