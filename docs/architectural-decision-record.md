# Architectural Decision Record

A living log of significant architectural decisions made in this project. Each entry describes the context, decision, and rationale.

---

## 2026-02-22 — Go fully static (SQLite + CSV overrides + static site build)

**Context.** The original architecture used PostgreSQL as a runtime store and a FastAPI backend serving a live `/api/entries` endpoint. An admin interface (with JWT authentication) allowed manual correction of scraper output, but admin edits were silently overwritten whenever a new scrape ran, since the scraper used an unconditional `ON CONFLICT DO UPDATE`. This created a correctness problem in production and unnecessary operational complexity (Docker, Postgres, JWT auth machinery, Alembic migrations).

**Decision.** The system was redesigned as a fully static site. The scraper now writes to a local SQLite database file (a gitignored build artifact — no Docker or running service required). Manual corrections are expressed as rows in `data/overrides.csv`, which is committed to git. A new export script reads the SQLite DB, applies overrides, and emits `frontend/public/entries.json`. Vite bundles that JSON file into the frontend, producing a `dist/` directory that is deployable to any CDN with no backend at runtime.

**Rationale.** The dataset is small and finite (hundreds to low-thousands of D&D Beyond entries). Overrides are infrequent and always developer-authored, so git is a better home for them than a database — it provides version history, reviewability in PRs, and reproducibility for free. SQLite eliminates Docker as a prerequisite and makes Alembic unnecessary (the schema is created by `create_all()` on first run). With no runtime API, the frontend loads its data instantaneously from the bundled JSON rather than waiting on a network fetch, and the entire production infrastructure shrinks to a CDN and a static directory. The backend and database are now purely build-time concerns.

**Follow-up (completed 2026-02-22).** After this migration, the FastAPI web server layer (`app/main.py`, `app/routers/`, `app/schemas.py`) became vestigial — nothing called `GET /api/entries` anymore. These files, along with the `fastapi[standard]` dependency, the `be-dev`/`dev` justfile commands, `get_db()` from `database.py`, and `cors_origins` from `config.py`, were subsequently removed. The backend is now purely build-time tooling: SQLAlchemy models, database setup, config, and the two scripts.

---

## 2026-03-15 — Add D&D Beyond sitemap scraper as primary URL source

**Context.** The Common Crawl scraper was the sole source of D&D Beyond URLs, but Common Crawl's coverage is incomplete and inconsistent — only 275/319 SRD spells, 220/334 SRD monsters, 3/9 species, and 0 subclasses were indexed. Coverage depended on which pages Common Crawl happened to visit, leading to significant gaps in core content categories.

**Decision.** A second scraper (`scrape_sitemap.py`) fetches the official D&D Beyond sitemap index, which links to per-category sub-sitemaps (`sitemap-rpgspell-1.xml`, `sitemap-rpgmonster-1.xml`, etc.). The sitemap provides a complete, authoritative list of every official content page. The scraper parses the XML, extracts URLs, derives names from slugs, and upserts into the same SQLite database. The upsert uses `COALESCE(excluded.edition, entries.edition)` so that edition data already populated by Common Crawl is preserved — the sitemap doesn't carry edition information.

**Rationale.** The sitemap is fast (7 small XML files vs. querying 10 Common Crawl indexes), complete (1,098 entries covering all categories except Equipment), and guaranteed to contain only official content (no homebrew filtering needed). Common Crawl remains valuable for edition detection via WARC records, but the sitemap is now the recommended first step in the scraping pipeline. The class sitemap mixes base classes and subclasses under `/classes/`; a curated set of known class slugs distinguishes them.

**Limitation.** The sitemap does not include Equipment pages — those still depend on Common Crawl.
