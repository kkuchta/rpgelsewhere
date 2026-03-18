# Additional Data Sources for Better Coverage

Common Crawl is a good low-friction discovery source, but it is clearly leaving holes in the dataset. Based on a live check of D&D Beyond on 2026-03-07, these are the most promising supplemental sources for this project.

## Recommended order

1. **D&D Beyond paginated list pages** - best source for broad URL discovery
2. **D&D Beyond XML sitemaps** - stable baseline for core content
3. **Internet Archive Wayback CDX** - useful archival backfill when Common Crawl misses pages
4. **Structured open 5e datasets (5e-bits / dnd5eapi / Open5e)** - best for coverage checks and override seeding, not primary URL discovery

## 1) D&D Beyond paginated list pages

Example URLs:

- `https://www.dndbeyond.com/spells?page=1`
- `https://www.dndbeyond.com/monsters?page=1`
- `https://www.dndbeyond.com/magic-items?page=1`
- `https://www.dndbeyond.com/equipment?page=1`
- `https://www.dndbeyond.com/species?page=1`
- `https://www.dndbeyond.com/feats?page=1`
- `https://www.dndbeyond.com/backgrounds?page=1`
- `https://www.dndbeyond.com/classes`

### Why this helps

- These pages return server HTML with direct links to detail pages such as `/spells/1989-acid-splash` and `/monsters/16762-aboleth`.
- D&D Beyond's `robots.txt` explicitly allows paginated list pages like `/spells/?page=*`, `/monsters/?page=*`, and `/magic-items/?page=*`.
- In spot checks, the HTML already exposed many links that Common Crawl is currently missing, especially for:
  - classes
  - species
  - feats
  - backgrounds
  - equipment
  - magic items
  - monsters
  - spells

### Best use in this repo

Use these pages as a **primary URL inventory source**, then keep the current WARC/detail-page logic only for:

- edition detection
- homebrew filtering
- deduplication/normalization

That would likely produce a much more complete URL set than asking Common Crawl to discover detail pages directly.

### Caveats

- Subclasses do not appear to have a simple public paginated listing page at `/subclasses?page=1`.
- Some categories may still load part of their data dynamically, so pagination behavior needs to be tested carefully.
- Even if these pages are accessible, the scraper should stay polite and rate-limited.

## 2) D&D Beyond XML sitemaps

Confirmed sitemap index:

- `https://www.dndbeyond.com/sitemap.xml`

Confirmed content sitemap files:

- `http://www.dndbeyond.com/sitemap-rpgclass-1.xml`
- `http://www.dndbeyond.com/sitemap-rpgrace-1.xml`
- `http://www.dndbeyond.com/sitemap-rpgfeat-1.xml`
- `http://www.dndbeyond.com/sitemap-rpgbackground-1.xml`
- `http://www.dndbeyond.com/sitemap-rpgmagicitem-1.xml`
- `http://www.dndbeyond.com/sitemap-rpgmonster-1.xml`
- `http://www.dndbeyond.com/sitemap-rpgspell-1.xml`

### Why this helps

- Sitemaps give you canonical URLs without needing crawl discovery.
- They are cheap to fetch and easy to parse.
- They are especially useful as a baseline set for spells, monsters, magic items, classes, and core species/races.

### Best use in this repo

Use sitemap URLs as a **seed source** before or alongside Common Crawl. They are a good fit for:

- initial bootstrap
- validating that the scraper has not regressed
- filling gaps in core/SRD-like content

### Caveats

- The sitemap coverage does **not** appear to include the full D&D Beyond catalog.
- In spot checks, some sitemap counts were much smaller than the live list pages for categories like feats, backgrounds, and species.
- This makes sitemaps a strong baseline, but not a complete replacement for a broader source.

## 3) Internet Archive Wayback CDX API

Docs:

- `https://archive.org/developers/wayback-cdx-server.html`

Example query:

```text
https://web.archive.org/cdx/search/cdx?url=www.dndbeyond.com/spells/*&output=json&matchType=prefix
```

### Why this helps

- It is another independent archive index, similar in spirit to Common Crawl.
- It can surface URLs or historical captures that Common Crawl missed.
- It can help recover pages that existed previously but have become harder to discover.

### Best use in this repo

Use Wayback as a **secondary archival backfill source** for categories with known gaps:

- subclasses
- species/races
- equipment
- monsters

### Caveats

- Coverage is inconsistent and time-dependent.
- Output will include duplicate captures, so it needs normalization and collapsing.
- Fetching archived HTML is slower and less direct than using live list pages or sitemaps.

## 4) Structured open datasets: 5e-bits / dnd5eapi / Open5e

Examples:

- `https://www.dnd5eapi.co/`
- `https://github.com/5e-bits/5e-database`
- `https://open5e.com/api-docs`

### Why this helps

- These datasets are structured, queryable, and easy to diff against your output.
- They are excellent for identifying missing core content and seeding `data/overrides.csv`.
- They are already useful in this repo via `docs/srd-completeness.md`.

### Best use in this repo

Keep using these sources for:

- completeness reporting
- naming reconciliation
- manual override generation
- regression checks in CI

### Caveats

- They are **not** canonical D&D Beyond URL sources.
- They cover SRD/open content, not the full commercial D&D Beyond catalog.
- Names may differ from D&D Beyond naming conventions (for example, SRD spell names that strip proper nouns).

## Lower-priority fallback: search-engine APIs

If subclasses remain hard to discover, a search API constrained to `site:dndbeyond.com` could be a last-resort discovery layer for missed detail pages.

Examples:

- `site:dndbeyond.com/subclasses`
- `site:dndbeyond.com/species`
- `site:dndbeyond.com/classes`

This should be considered a fallback only:

- result sets are less deterministic
- APIs may cost money
- ranking changes over time
- deduplication is noisy

## Practical recommendation

If the goal is to improve completeness with the least complexity, the next step should be:

1. Add a scraper path that enumerates URLs from D&D Beyond list pages.
2. Add sitemap ingestion as a cheap baseline seed.
3. Keep Common Crawl and Wayback for archival/backfill use.
4. Keep SRD/Open5e data for completeness checks and manual override support.

That combination should materially improve coverage without abandoning the current architecture.
