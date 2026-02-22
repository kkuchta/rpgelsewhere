# Architectural Decision Record

A living log of significant architectural decisions made in this project. Each entry describes the context, decision, and rationale.

---

## 2026-02-22 — Go fully static (SQLite + CSV overrides + static site build)

**Context.** The original architecture used PostgreSQL as a runtime store and a FastAPI backend serving a live `/api/entries` endpoint. An admin interface (with JWT authentication) allowed manual correction of scraper output, but admin edits were silently overwritten whenever a new scrape ran, since the scraper used an unconditional `ON CONFLICT DO UPDATE`. This created a correctness problem in production and unnecessary operational complexity (Docker, Postgres, JWT auth machinery, Alembic migrations).

**Decision.** The system was redesigned as a fully static site. The scraper now writes to a local SQLite database file (a gitignored build artifact — no Docker or running service required). Manual corrections are expressed as rows in `data/overrides.csv`, which is committed to git. A new export script reads the SQLite DB, applies overrides, and emits `frontend/public/entries.json`. Vite bundles that JSON file into the frontend, producing a `dist/` directory that is deployable to any CDN with no backend at runtime.

**Rationale.** The dataset is small and finite (hundreds to low-thousands of D&D Beyond entries). Overrides are infrequent and always developer-authored, so git is a better home for them than a database — it provides version history, reviewability in PRs, and reproducibility for free. SQLite eliminates Docker as a prerequisite and makes Alembic unnecessary (the schema is created by `create_all()` on first run). With no runtime API, the frontend loads its data instantaneously from the bundled JSON rather than waiting on a network fetch, and the entire production infrastructure shrinks to a CDN and a static directory. The backend and database are now purely build-time concerns.

**Follow-up (discovered during implementation).** After this migration, the FastAPI web server layer (`app/main.py`, `app/routers/`, `app/schemas.py`) became vestigial — nothing calls `GET /api/entries` anymore. The genuinely useful backend code is only the SQLAlchemy model (`app/models.py`), database setup (`app/database.py`), config (`app/config.py`), and the two scripts. Removing FastAPI and its dependency entirely is a natural next step.
