#!/usr/bin/env bash
# PayUp API Test Script
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
TOKEN=""
USER_ID=""
GROUP_ID=""
EXPENSE_ID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; }

check_health() {
    log "Checking health endpoint..."
    local response
    response=$(curl -s "${API_BASE}/health" 2>/dev/null) || {
        err "Backend not responding at ${API_BASE}/health"
        return 1
    }
    echo "Response: $response"
}

test_register() {
    log "Testing registration..."
    local email="test_$(date +%s)@example.com"
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"password123\",\"display_name\":\"Test User\"}" 2>/dev/null)
    echo "Response: $response"
    
    TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    if [[ -z "$TOKEN" ]]; then
        err "Failed to get token from registration"
        return 1
    fi
    log "Got token: ${TOKEN:0:20}..."
}

test_login() {
    log "Testing login..."
    # Login with existing test user
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"password123"}' 2>/dev/null)
    echo "Response: $response"
}

test_me() {
    log "Testing /v1/auth/me..."
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/auth/me" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
    USER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log "User ID: ${USER_ID}"
}

test_create_group() {
    log "Testing create group..."
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/groups" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Group","description":"Test group for API testing"}' 2>/dev/null)
    echo "Response: $response"
    GROUP_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log "Group ID: ${GROUP_ID}"
}

test_list_groups() {
    log "Testing list groups..."
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/groups" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
}

test_create_expense() {
    log "Testing create expense..."
    if [[ -z "$GROUP_ID" ]]; then
        warn "No group ID, skipping expense test"
        return 0
    fi
    local response
    # Expense requires splits map - each user ID maps to their share
    local splits_json
    splits_json="{\"${USER_ID}\":100.00}"
    response=$(curl -s -X POST "${API_BASE}/v1/groups/${GROUP_ID}/expenses" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Test Expense\",\"amount\":100.00,\"payerId\":\"${USER_ID}\",\"splits\":${splits_json}}" 2>/dev/null)
    echo "Response: $response"
    
    if echo "$response" | grep -q '"error"'; then
        err "Expense creation failed: $response"
        return 1
    fi
    
    EXPENSE_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log "Expense ID: ${EXPENSE_ID}"
}

# Main test runner
main() {
    log "PayUp API Test Suite"
    log "API Base: ${API_BASE}"
    echo ""
    
    check_health || exit 1
    echo ""
    
    test_register || exit 1
    echo ""
    
    test_me || exit 1
    echo ""
    
    test_create_group || exit 1
    echo ""
    
    test_list_groups || exit 1
    echo ""
    
    test_create_expense || exit 1
    echo ""
    
    log "All tests passed!"
}

main "$@"
