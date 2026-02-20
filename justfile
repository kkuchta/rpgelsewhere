# Infrastructure
db-up:
    docker compose up -d

db-down:
    docker compose down

db-migrate:
    cd backend && uv run alembic upgrade head

# Backend
be-install:
    cd backend && uv sync

be-dev:
    cd backend && uv run uvicorn app.main:app --reload

be-lint:
    cd backend && uv run ruff check . && uv run ruff format --check .

be-lint-fix:
    cd backend && uv run ruff check --fix . && uv run ruff format .

# Frontend
fe-install:
    cd frontend && npm install

fe-dev:
    cd frontend && npm run dev

fe-lint:
    cd frontend && npm run lint

fe-typecheck:
    cd frontend && npx tsc --noEmit

fe-test:
    cd frontend && npm test

# Scraper
scrape:
    cd backend && uv run python -m scripts.scrape_commoncrawl

scrape-test:
    cd backend && uv run python -m scripts.scrape_commoncrawl --limit 5 --crawls 1

# All
lint:
    just be-lint && just fe-lint && just fe-typecheck

dev:
    just be-dev & just fe-dev
