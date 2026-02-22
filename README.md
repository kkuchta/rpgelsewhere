# RPGElsewhere

A fast search tool for [D&D Beyond](https://www.dndbeyond.com/) content. Search spells, monsters, classes, equipment, and more — and jump straight to the relevant D&D Beyond page.

## How it works

1. **Scraper** — queries the [Common Crawl](https://commoncrawl.org/) CDX API to discover D&D Beyond URLs, extracts names from URL slugs (`acid-splash` → "Acid Splash"), fetches the archived page HTML via WARC records to filter out homebrew content and detect whether the entry is 2014 legacy or 2024 edition, and stores everything in Postgres.
2. **API** — a FastAPI backend serves entries via a simple CRUD API.
3. **Search UI** — a React frontend loads all entries once and does client-side search with a custom scoring algorithm. Legacy (2014) entries are labeled in the results.

# Requirements

- We can't scrape dndbeyond.com directly because of their strong anti-bot protections. We can't use google or bing search apis because of their TOSs against caching search results.
- The search must be _incredibly_ fast. Client-side only except _maybe_ something serverside for a fallback.
- We're going to use commoncrawl. Not all spells/classes/etc will be present in each crawl, but hopefully over the course of a few crawls, we can most of the spells/classes/races/etc.
- We should have an interface to add mappings manually when we find deficiencies.
- Search must be _intelligent_. We want the "Wizard" class to show up before the "Red Wizard" monster or whatever. This logic must be well-segmented out so that we can A. test it and B. modify it later as we come up with ideas to improve it.

## Stack

| Layer    | Tools                                                         |
| -------- | ------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4, React Router 7     |
| Backend  | FastAPI, SQLAlchemy, Alembic, PostgreSQL 16                   |
| Tooling  | Docker Compose, [`just`](https://github.com/casey/just), `uv` |

## Getting started

### Prerequisites

- Docker
- [`just`](https://github.com/casey/just)
- [`uv`](https://docs.astral.sh/uv/)
- Node.js / npm

### Setup

```bash
# Copy and configure environment variables (required for admin auth)
cp .env.example backend/.env
# Edit backend/.env and set ADMIN_PASSWORD and JWT_SECRET

# Start the database
just db-up

# Install dependencies
just be-install
just fe-install

# Run migrations
just db-migrate

# Scrape some data (classes + species only, all crawls — good for testing)
just scrape-test

# Start dev servers (frontend + backend)
just dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:8000`.

## Available commands

```bash
just dev          # Run frontend and backend concurrently
just be-dev       # Backend only (uvicorn, hot reload)
just fe-dev       # Frontend only (Vite)

just db-up        # Start Postgres via Docker Compose
just db-down      # Stop Postgres
just db-migrate   # Run Alembic migrations

just scrape       # Scrape all categories from Common Crawl (full run)
just scrape-test  # Scrape classes + species only (faster, good for local dev)

# Scraper flags (pass after scrape/scrape-test via -- if needed):
#   --categories Class Spell ...   Only scrape specific categories
#   --skip-warc                    Skip edition detection and homebrew filtering (faster, edition stored as NULL)
#   --dry-run                      Print results without writing to DB
#   --limit N                      Cap results per category per crawl
#   --crawls N                     Number of recent Common Crawl snapshots to search

just lint         # Lint backend + frontend + typecheck
just fe-test      # Run frontend tests
```

## Content categories

The scraper indexes the following D&D Beyond content types:

- Spells, Classes, Subclasses
- Species (Races), Monsters
- Magic Items, Equipment
- Feats, Backgrounds

## Environment variables

The backend reads from `backend/.env` (see `.env.example`):

| Variable       | Required | Description                                          |
| -------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL` | No       | Postgres connection string (defaults to local dev)   |
| `ADMIN_PASSWORD` | Yes    | Password to log in to the `/admin` interface         |
| `JWT_SECRET`   | Yes      | Secret used to sign admin JWTs (use `openssl rand -hex 32`) |

## Admin interface

Visit `/admin` and log in with `ADMIN_PASSWORD`. The session lasts 24 hours and is stored in `sessionStorage`. Write operations (create, update, delete) require a valid JWT; reads are public.

Login attempts are rate-limited to 20 failures per IP within a 5-minute sliding window. Exceeding this returns `429 Too Many Requests` with a `Retry-After` header. Successful logins do not count toward the limit.

## Documentation

- [`docs/common-crawl.md`](docs/common-crawl.md) — CDX API usage, WARC record fetching, and rate limiting guidelines

## Project structure

```
rpgelsewhere/
├── backend/
│   ├── app/             # FastAPI app (models, schemas, routers)
│   ├── alembic/         # Database migrations
│   └── scripts/         # scrape_commoncrawl.py
├── frontend/
│   └── src/
│       ├── search/      # Client-side search + scoring algorithm
│       ├── pages/       # SearchPage, AdminPage
│       └── components/  # SearchBox, SearchResult
├── docs/                # Project documentation
├── docker-compose.yml
└── justfile
```
