#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  # Allow `.env` in repo root or backend/ for convenience.
  if [ -f "../.env" ]; then
    set -a; source "../.env"; set +a
  elif [ -f ".env" ]; then
    set -a; source ".env"; set +a
  fi
fi

: "${DATABASE_URL:?DATABASE_URL must be set (put it in ../.env or export it)}"

go run ./cmd/migrate up

