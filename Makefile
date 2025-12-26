# PayUp Development Makefile
# Run `make help` to see available commands

.PHONY: help setup dev dev-docker db db-stop migrate migrate-status test lint clean

# Default target
help:
	@echo ""
	@echo "PayUp Development Commands"
	@echo "=========================="
	@echo ""
	@echo "  make setup        First-time setup (creates .env, starts db, runs migrations)"
	@echo "  make dev          Start development server (backend + frontend)"
	@echo "  make dev-docker   Start full stack via Docker Compose"
	@echo ""
	@echo "  make db           Start Postgres container"
	@echo "  make db-stop      Stop Postgres container"
	@echo "  make db-reset     Reset database (delete volume and restart)"
	@echo ""
	@echo "  make migrate      Run database migrations"
	@echo "  make migrate-status  Show migration status"
	@echo ""
	@echo "  make test         Run backend tests"  
	@echo "  make lint         Run linters (backend + frontend)"
	@echo ""
	@echo "  make clean        Stop all containers and remove volumes"
	@echo ""

# ─────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────

setup:
	@chmod +x ./setup.sh
	@./setup.sh

# ─────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────

dev: db-ensure
	@./dev.sh

dev-docker:
	docker compose -f docker-compose.dev.yml up --build

# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────

db:
	docker compose -f backend/docker-compose.yml up -d

db-stop:
	docker compose -f backend/docker-compose.yml down

db-reset:
	docker compose -f backend/docker-compose.yml down -v
	docker compose -f backend/docker-compose.yml up -d
	@echo "Waiting for Postgres..."
	@sleep 3
	@$(MAKE) migrate

db-ensure:
	@docker compose -f backend/docker-compose.yml ps --status running | grep -q postgres || $(MAKE) db
	@sleep 1

# ─────────────────────────────────────────────────────────────
# Migrations
# ─────────────────────────────────────────────────────────────

migrate:
	@if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	cd backend && go run ./cmd/migrate up

migrate-status:
	@if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	cd backend && go run ./cmd/migrate status

# ─────────────────────────────────────────────────────────────
# Testing & Linting
# ─────────────────────────────────────────────────────────────

test:
	cd backend && go test ./...

lint:
	@echo "Linting backend..."
	cd backend && go vet ./...
	@echo "Linting frontend..."
	cd frontend && npm run lint

# ─────────────────────────────────────────────────────────────
# Cleanup
# ─────────────────────────────────────────────────────────────

clean:
	docker compose -f backend/docker-compose.yml down -v
	docker compose down -v 2>/dev/null || true
	@echo "Cleaned up containers and volumes"
