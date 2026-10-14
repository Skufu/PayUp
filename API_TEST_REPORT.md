# PayUp API Test Report

**Date:** 2026-05-05  
**Status:** ✅ All tests passing  
**API Base:** http://localhost:8080

## Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Health | 1 | 1 | 0 |
| Auth | 4 | 4 | 0 |
| Groups | 3 | 3 | 0 |
| Expenses | 2 | 2 | 0 |
| Balances | 1 | 1 | 0 |
| **Total** | **11** | **11** | **0** |

## Test Details

### ✅ Health Check
- Endpoint: `GET /health`
- Status: OK
- Response: `{"status":"ok"}`

### ✅ Auth Endpoints

#### Register: `POST /v1/auth/register`
- Creates new user with email, password, display_name
- Returns: user object + access/refresh tokens

#### Me: `GET /v1/auth/me`
- Returns current user info
- Requires: Bearer token

#### Refresh: `POST /v1/auth/refresh`
- **Note:** Uses camelCase `refreshToken` in request body
- Returns: new access token

### ✅ Groups Endpoints

#### Create: `POST /v1/groups`
- Body: `{"name": "Group Name", "description": "..."}`
- Auto-adds creator as owner

#### List: `GET /v1/groups`
- Returns: array of groups with member counts

#### Get: `GET /v1/groups/:id`
- Returns: group details + members list

### ✅ Expenses Endpoints

#### Create: `POST /v1/groups/:id/expenses`
- **Important:** Requires `splits` map in body
- Example body:
```json
{
  "title": "Test Expense",
  "amount": 100.00,
  "payerId": "user-uuid",
  "splits": {
    "user-uuid": 100.00
  }
}
```

#### List: `GET /v1/groups/:id/expenses`
- Returns: array of expenses with splits

### ✅ Balances Endpoints

#### Get: `GET /v1/groups/:id/balances`
- Returns: map of user_id -> balance (cents)

## Bug Fixes Discovered During Testing

### 1. Expense Creation - Missing splits (FIXED)
**Issue:** API expects `splits` map but documentation wasn't clear
**Fix:** Updated test to include proper splits mapping

### 2. Token Refresh - Field naming (FIXED)
**Issue:** Test used `refresh_token` (snake_case) but API expects `refreshToken` (camelCase)
**Fix:** Updated test request body

## Scripts Created

### 1. Quick Test (`scripts/api_test.sh`)
- Fast smoke test
- Tests: health, register, me, groups, expenses
- Runtime: ~3 seconds

### 2. Full Test Suite (`scripts/api_test_full.sh`)
- Comprehensive API coverage
- Tests: all endpoints with assertions
- Runtime: ~5 seconds
- Output: Pass/fail summary with details

## Usage

```bash
# Start backend
cd backend && go run ./cmd/api

# In another terminal, run tests
cd ~/workspace/github.com/Skufu/PayUp
./scripts/api_test.sh        # Quick test
./scripts/api_test_full.sh   # Full test suite
```

## Recommendations

1. **CI/CD Integration:** Add `api_test_full.sh` to CI pipeline
2. **Load Testing:** Consider k6 for concurrent load testing
3. **Contract Testing:** Use OpenAPI spec for contract validation
4. **Documentation:** Update API docs with request/response examples

---

**Tested By:** Hermes Agent  
**Backend Version:** Go 1.24 + Gin  
**Database:** Neon PostgreSQL
