# RPGElsewhere

A fast search tool for [D&D Beyond](https://www.dndbeyond.com/) content. Search spells, monsters, classes, equipment, and more — and jump straight to the relevant D&D Beyond page.

## How it works

1. **Scraper** — queries the [Common Crawl](https://commoncrawl.org/) CDX API to discover D&D Beyond URLs, extracts names from URL slugs (`acid-splash` → "Acid Splash"), and stores them in Postgres.
2. **API** — a FastAPI backend serves entries via a simple CRUD API.
3. **Search UI** — a React frontend loads all entries once and does client-side search with a custom scoring algorithm.

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
# Start the database
just db-up

# Install dependencies
just be-install
just fe-install

# Run migrations
just db-migrate

# Scrape some data (optional test run: 5 entries from 1 crawl)
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

just scrape       # Scrape D&D Beyond URLs from Common Crawl
just scrape-test  # Test scrape (5 entries, 1 crawl)

just lint         # Lint backend + frontend + typecheck
just fe-test      # Run frontend tests
```

## Content categories

The scraper indexes the following D&D Beyond content types:

- Spells, Classes, Subclasses
- Species (Races), Monsters
- Magic Items, Equipment
- Feats, Backgrounds

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
├── docker-compose.yml
└── justfile
```
