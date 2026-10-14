#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_PID=""

load_env_file() {
  local file="$1"
  local line key value

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line//[[:space:]]/}" || "${line}" =~ ^[[:space:]]*# ]] && continue

    if [[ "${line}" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"

      if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi

      export "${key}=${value}"
    fi
  done < "${file}"
}

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
  load_env_file "${ROOT_DIR}/.env"
fi

BACKEND_PORT="${PORT:-8080}"

echo "Starting backend (Go) on :${BACKEND_PORT}..."
(cd "${ROOT_DIR}/backend" && go run ./cmd/api) &
BACKEND_PID="$!"

for _ in {1..30}; do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    wait "${BACKEND_PID}"
    exit 1
  fi

  if curl -fsS "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    break
  fi

  sleep 0.5
done

if ! curl -fsS "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
  echo "Backend did not become healthy on :${BACKEND_PORT}."
  exit 1
fi

echo "Starting frontend (Vite)..."
exec npm --prefix "${ROOT_DIR}/frontend" run dev -- --host

