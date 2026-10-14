#!/usr/bin/env bash
# PayUp API Full Test Suite
# Tests all major endpoints and reports failures
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
GROUP_ID=""
EXPENSE_ID=""
PAYMENT_ID=""
INVITE_CODE=""

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; }

assert_json_contains() {
    local response="$1"
    local key="$2"
    if echo "$response" | grep -q "\"$key\""; then
        return 0
    else
        err "Expected JSON to contain key: $key"
        echo "Response: $response"
        return 1
    fi
}

assert_no_error() {
    local response="$1"
    if echo "$response" | grep -q '"error"'; then
        err "Expected no error but got: $response"
        return 1
    else
        return 0
    fi
}

run_test() {
    local test_name="$1"
    local test_func="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo ""
    log "=== $test_name ==="
    
    if $test_func; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log "✓ PASSED: $test_name"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        err "✗ FAILED: $test_name"
    fi
}

# ==================== TEST FUNCTIONS ====================

test_health() {
    local response
    response=$(curl -s "${API_BASE}/health" 2>/dev/null)
    echo "Response: $response"
    assert_json_contains "$response" "status"
}

test_auth_register() {
    local email="test_$(date +%s)_$$@example.com"
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"password123\",\"display_name\":\"Test User\"}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
    assert_json_contains "$response" "accessToken"
    
    TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$response" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    info "Token: ${TOKEN:0:20}..."
    info "User ID: $USER_ID"
}

test_auth_me() {
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/auth/me" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
    assert_json_contains "$response" "email"
}

test_auth_refresh() {
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
    assert_json_contains "$response" "accessToken"
}

test_groups_create() {
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/groups" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Group","description":"API Test Group"}' 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
    assert_json_contains "$response" "id"
    
    GROUP_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    info "Group ID: $GROUP_ID"
}

test_groups_list() {
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/groups" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
}

test_groups_get() {
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/groups/${GROUP_ID}" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
    assert_json_contains "$response" "name"
}

test_expenses_create() {
    # Expense requires splits map
    local splits_json="{\"${USER_ID}\":100.00}"
    local response
    response=$(curl -s -X POST "${API_BASE}/v1/groups/${GROUP_ID}/expenses" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Test Expense\",\"amount\":100.00,\"payerId\":\"${USER_ID}\",\"splits\":${splits_json}}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
    assert_json_contains "$response" "id"
    
    EXPENSE_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    info "Expense ID: $EXPENSE_ID"
}

test_expenses_list() {
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/groups/${GROUP_ID}/expenses" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
}

test_balances_get() {
    local response
    response=$(curl -s -X GET "${API_BASE}/v1/groups/${GROUP_ID}/balances" \
        -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
    echo "Response: $response"
    
    assert_no_error "$response" || return 1
}

# ==================== MAIN ====================

main() {
    log "PayUp API Full Test Suite"
    log "API Base: ${API_BASE}"
    echo ""
    
    run_test "Health Check" test_health
    run_test "Auth Register" test_auth_register
    run_test "Auth Me" test_auth_me
    run_test "Auth Refresh" test_auth_refresh
    run_test "Groups Create" test_groups_create
    run_test "Groups List" test_groups_list
    run_test "Groups Get" test_groups_get
    run_test "Expenses Create" test_expenses_create
    run_test "Expenses List" test_expenses_list
    run_test "Balances Get" test_balances_get
    
    echo ""
    echo "========================================"
    log "Test Results:"
    echo "  Total:  $TESTS_RUN"
    echo "  Passed: $TESTS_PASSED"
    echo "  Failed: $TESTS_FAILED"
    echo "========================================"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log "✓ All tests passed!"
        exit 0
    else
        err "✗ Some tests failed!"
        exit 1
    fi
}

main "$@"
