# RPGElsewhere

A fast search tool for [D&D Beyond](https://www.dndbeyond.com/) content. Search spells, monsters, classes, equipment, and more — and jump straight to the relevant D&D Beyond page.

## How it works

D&D Beyond blocks direct scraping, so we index content via [Common Crawl](https://commoncrawl.org/) instead.

1. **Scraper** — queries the Common Crawl CDX API to discover D&D Beyond URLs, extracts names from URL slugs (`acid-splash` → "Acid Splash"), fetches the archived page HTML via WARC records to filter out homebrew content and detect whether the entry is 2014 legacy or 2024 edition, and stores everything in a local SQLite database.
2. **Overrides** — `data/overrides.csv` (committed to git) provides manual corrections: add missing entries, fix names/categories, or exclude junk the scraper picked up.
3. **Export** — combines the DB with overrides and writes `frontend/public/entries.json`.
4. **Static site** — Vite bundles `entries.json` into the frontend. The resulting `dist/` directory is a fully static site with no backend required at runtime.

## Stack

| Layer    | Tools                                                         |
| -------- | ------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4, React Router 7     |
| Backend  | SQLAlchemy, SQLite                                            |
| Tooling  | [`just`](https://github.com/casey/just), `uv`                 |

## Getting started

### Prerequisites

- [`just`](https://github.com/casey/just)
- [`uv`](https://docs.astral.sh/uv/)
- Node.js / npm

### Setup

```bash
# Install dependencies
just be-install
just fe-install

# Scrape some data (classes + species only, all crawls — good for testing)
just scrape-test

# Export entries.json
just export

# Start the frontend dev server
just fe-dev
```

The frontend runs at `http://localhost:5173`.

### Production build

```bash
just build   # just export && just fe-build
```

The `frontend/dist/` directory is a fully static site — deploy it to any CDN.

## Available commands

```bash
just fe-dev       # Frontend dev server

just scrape       # Scrape all categories from Common Crawl (full run)
just scrape-test  # Scrape classes + species only (faster, good for local dev)

# Scraper flags (pass after scrape/scrape-test):
#   --categories Class Spell ...   Only scrape specific categories
#   --skip-warc                    Skip edition detection and homebrew filtering (faster, edition stored as NULL)
#   --dry-run                      Print results without writing to DB
#   --limit N                      Cap results per category per crawl
#   --crawls N                     Number of recent Common Crawl snapshots to search

just export       # Apply overrides and write frontend/public/entries.json
just fe-build     # Build the frontend (npm run build)
just build        # Full build: export + fe-build

just lint         # Lint backend + frontend + typecheck
just fe-test      # Run frontend tests
```

## Content categories

The scraper indexes the following D&D Beyond content types:

- Spells, Classes, Subclasses
- Species (Races), Monsters
- Magic Items, Equipment
- Feats, Backgrounds

## Overrides

Edit `data/overrides.csv` to manually correct the scraper output. Commit the file to git — changes are reviewed in PRs and version-tracked automatically.

| Column     | Description                                     |
| ---------- | ----------------------------------------------- |
| `action`   | `add`, `update`, or `delete`                    |
| `url`      | The D&D Beyond URL (used as the unique key)     |
| `name`     | Entry name (leave blank on `delete`)            |
| `category` | One of the content categories (leave blank on `delete`) |
| `edition`  | `legacy`, `2024`, or blank                      |

- **add** — insert an entry the scraper never found (all fields required)
- **update** — override specific fields on a scraped entry matched by URL (empty fields are left unchanged; if the URL isn't in the DB it behaves like `add`)
- **delete** — exclude an entry from the output

## Environment variables

The backend reads from `backend/.env` (see `.env.example`). In most cases no configuration is needed — the defaults work out of the box.

| Variable       | Required | Description                                          |
| -------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL` | No       | SQLite connection string (defaults to `sqlite:///data/entries.db`) |

## Deployment

The site is deployed to Netlify and auto-deploys on every push to `main`.

**One-time setup:** Connect the GitHub repo in the Netlify dashboard (Sites > Add new site > Import an existing project). Netlify will detect `netlify.toml` automatically.

**Update cycle:** `entries.json` is committed to git and is the only data the frontend needs at build time. To publish new scraper results:

```bash
just scrape    # or scrape-test for a partial run
just export    # writes frontend/public/entries.json
git add frontend/public/entries.json
git commit -m "update entries"
git push       # triggers a Netlify deploy
```

## CI

GitHub Actions runs on every push to `main` and on pull requests:

- **Backend** — `ruff check` and `ruff format --check`
- **Frontend** — ESLint, TypeScript type-check, and Vitest tests

## Documentation

- [`docs/common-crawl.md`](docs/common-crawl.md) — CDX API usage, WARC record fetching, and rate limiting guidelines
- [`docs/architectural-decision-record.md`](docs/architectural-decision-record.md) — major architectural decisions

## Project structure

```
rpgelsewhere/
├── backend/
│   ├── app/             # SQLAlchemy models and database setup
│   └── scripts/         # scrape_commoncrawl.py, export_entries.py
├── data/
│   └── overrides.csv    # Manual entry corrections (committed to git)
├── frontend/
│   └── src/
│       ├── search/      # Client-side search + scoring algorithm
│       ├── pages/       # SearchPage
│       └── components/  # SearchBox, SearchResult
├── docs/                # Project documentation
└── justfile
```
