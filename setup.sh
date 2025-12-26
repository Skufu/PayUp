#!/usr/bin/env bash
#
# PayUp Development Setup Script
# Run this once after cloning to set up your local development environment.
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_step() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     PayUp Development Setup          ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────
# 1. Check required tools
# ─────────────────────────────────────────────────────────────
print_step "Checking required tools..."

MISSING_TOOLS=()

if ! command -v docker &> /dev/null; then
  MISSING_TOOLS+=("docker")
fi

if ! command -v go &> /dev/null; then
  MISSING_TOOLS+=("go")
fi

if ! command -v node &> /dev/null; then
  MISSING_TOOLS+=("node")
fi

if ! command -v npm &> /dev/null; then
  MISSING_TOOLS+=("npm")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
  print_error "Missing required tools: ${MISSING_TOOLS[*]}"
  echo ""
  echo "Please install the missing tools:"
  for tool in "${MISSING_TOOLS[@]}"; do
    case $tool in
      docker) echo "  - Docker: https://docs.docker.com/get-docker/" ;;
      go)     echo "  - Go: https://go.dev/doc/install" ;;
      node)   echo "  - Node.js: https://nodejs.org/" ;;
      npm)    echo "  - npm: comes with Node.js" ;;
    esac
  done
  exit 1
fi

print_success "All required tools found"
echo "   Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "   Go:     $(go version | cut -d' ' -f3)"
echo "   Node:   $(node --version)"
echo "   npm:    $(npm --version)"
echo ""

# ─────────────────────────────────────────────────────────────
# 2. Setup environment variables
# ─────────────────────────────────────────────────────────────
print_step "Setting up environment variables..."

if [ -f "${ROOT_DIR}/.env" ]; then
  print_success ".env file already exists"
else
  cp "${ROOT_DIR}/env.example" "${ROOT_DIR}/.env"
  print_success "Created .env from env.example"
  
  # Generate a random JWT secret
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  
  # Update JWT_SECRET in .env
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/JWT_SECRET=change-me/JWT_SECRET=${JWT_SECRET}/" "${ROOT_DIR}/.env"
  else
    sed -i "s/JWT_SECRET=change-me/JWT_SECRET=${JWT_SECRET}/" "${ROOT_DIR}/.env"
  fi
  
  print_success "Generated random JWT_SECRET"
  print_warning "Review .env and update any other values as needed"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 3. Start Postgres
# ─────────────────────────────────────────────────────────────
print_step "Starting Postgres database..."

cd "${ROOT_DIR}"
docker compose -f backend/docker-compose.yml up -d

# Wait for Postgres to be ready
print_step "Waiting for Postgres to be ready..."
RETRIES=30
until docker compose -f backend/docker-compose.yml exec -T postgres pg_isready -U payup -d payup &>/dev/null || [ $RETRIES -eq 0 ]; do
  echo -n "."
  RETRIES=$((RETRIES-1))
  sleep 1
done
echo ""

if [ $RETRIES -eq 0 ]; then
  print_error "Postgres failed to start. Check docker logs:"
  echo "  docker compose -f backend/docker-compose.yml logs postgres"
  exit 1
fi

print_success "Postgres is ready"
echo ""

# ─────────────────────────────────────────────────────────────
# 4. Run database migrations
# ─────────────────────────────────────────────────────────────
print_step "Running database migrations..."

# Load env vars
set -a
source "${ROOT_DIR}/.env"
set +a

cd "${ROOT_DIR}/backend"
go run ./cmd/migrate up

print_success "Migrations complete"
echo ""

# ─────────────────────────────────────────────────────────────
# 5. Install frontend dependencies
# ─────────────────────────────────────────────────────────────
print_step "Installing frontend dependencies..."

cd "${ROOT_DIR}/frontend"
npm install

print_success "Frontend dependencies installed"
echo ""

# ─────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════╗"
echo "║     Setup Complete! 🎉               ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Start the development server:"
echo "     ${BLUE}make dev${NC}   or   ${BLUE}./dev.sh${NC}"
echo ""
echo "  2. Open in your browser:"
echo "     Frontend: http://localhost:5173"
echo "     Backend:  http://localhost:8080/health"
echo ""
echo "Useful commands:"
echo "  make dev      - Start dev server (backend + frontend)"
echo "  make test     - Run backend tests"
echo "  make migrate  - Run database migrations"
echo "  make db-stop  - Stop Postgres"
echo ""
