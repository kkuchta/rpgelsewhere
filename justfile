# Backend
be-install:
    cd backend && uv sync


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
    cd backend && uv run python -m scripts.scrape_commoncrawl --categories Class Species

# Build
export:
    cd backend && uv run python -m scripts.export_entries

check-completeness:
    cd backend && uv run python -m scripts.evaluate_completeness

fe-build:
    cd frontend && npm run build

build: export fe-build

# All
lint:
    just be-lint && just fe-lint && just fe-typecheck
