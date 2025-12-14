#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_PID=""

cleanup() {
  echo ""
  echo "Stopping dev processes..."
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Load env if present (do NOT echo secrets)
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/.env"
  set +a
fi

echo "Starting backend (Go)..."
(cd "${ROOT_DIR}/backend" && go run ./cmd/api) &
BACKEND_PID="$!"

echo "Starting frontend (Vite)..."
exec npm --prefix "${ROOT_DIR}/frontend" run dev -- --host

