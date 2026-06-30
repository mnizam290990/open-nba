# openNBA — Root Makefile
# Provides cross-platform task orchestration shortcuts.

.PHONY: onboarding-check dev build lint test format clean

# ─────────────────────────────────────────────────────────────
# Developer Onboarding Check
# ─────────────────────────────────────────────────────────────

onboarding-check:
	@echo "Checking required tools..."
	@node --version || (echo "ERROR: Node.js not found (need >=20). Install: https://nodejs.org" && exit 1)
	@pnpm --version || (echo "ERROR: pnpm not found. Install: npm install -g pnpm" && exit 1)
	@python --version || python3 --version || (echo "ERROR: Python not found (need >=3.12)" && exit 1)
	@docker --version || (echo "ERROR: Docker not found. Install: https://docker.com" && exit 1)
	@uv --version || (echo "ERROR: uv not found. Install: pip install uv" && exit 1)
	@echo ""
	@echo "All required tools are installed!"

# ─────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

type-check:
	pnpm type-check

test:
	pnpm test

format:
	pnpm format

format-check:
	pnpm format:check

# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

db-reset:
	pnpm db:reset

db-studio:
	pnpm --filter=@opennba/db studio

# ─────────────────────────────────────────────────────────────
# Docker (local)
# ─────────────────────────────────────────────────────────────

docker-up:
	docker compose -f infra/local/docker-compose.yml up -d

docker-down:
	docker compose -f infra/local/docker-compose.yml down

docker-logs:
	docker compose -f infra/local/docker-compose.yml logs -f

# ─────────────────────────────────────────────────────────────
# Python (agent service)
# ─────────────────────────────────────────────────────────────

agent-install:
	cd services/agent && uv sync

agent-test:
	cd services/agent && uv run pytest

agent-lint:
	cd services/agent && uv run ruff check . && uv run mypy .

# ─────────────────────────────────────────────────────────────
# Cleanup
# ─────────────────────────────────────────────────────────────

clean:
	pnpm clean
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".mypy_cache" -type d -exec rm -rf {} + 2>/dev/null || true
