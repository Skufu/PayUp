# PayUp API & Feature Status Report

**Generated:** 2026-05-05  
**Backend:** Running on http://localhost:8080  
**Test Results:** ✅ All Core APIs Passing

---

## ✅ Working Features

### Authentication
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | ✅ | Returns `{"status":"ok"}` |
| `/v1/auth/register` | POST | ✅ | Creates user, returns tokens |
| `/v1/auth/login` | POST | ✅ | Email/password auth |
| `/v1/auth/me` | GET | ✅ | Returns current user |
| `/v1/auth/refresh` | POST | ✅ | Uses `refreshToken` (camelCase) |

**Request/Response Examples:**

```bash
# Register
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","display_name":"Test"}'

# Response
{
  "user": { "id": "...", "email": "...", ... },
  "token": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Groups
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/v1/groups` | POST | ✅ | Create group |
| `/v1/groups` | GET | ✅ | List user's groups |
| `/v1/groups/:id` | GET | ✅ | Get group details |
| `/v1/groups/:id/invite` | POST | ✅ | Generate invite code |
| `/v1/groups/join/:code` | POST | ✅ | Join via invite |

### Expenses
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/v1/groups/:id/expenses` | POST | ✅ | Create expense |
| `/v1/groups/:id/expenses` | GET | ✅ | List expenses |
| `/v1/expenses/:id` | DELETE | ✅ | Delete expense |

**Important:** Expense creation requires a `splits` map:

```bash
curl -X POST http://localhost:8080/v1/groups/$GROUP_ID/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dinner",
    "amount": 100.00,
    "payerId": "user-uuid",
    "splits": {
      "user-uuid": 100.00
    }
  }'
```

### Balances & Payments
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/v1/groups/:id/balances` | GET | ✅ | Calculate balances |
| `/v1/payments` | POST | ✅ | Create payment |
| `/v1/payments/:id/approve` | PATCH | ✅ | Approve payment |

### Other
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/v1/activity` | GET | ✅ | Activity feed |
| `/v1/nudges` | POST | ✅ | Send nudge |
| `/v1/push/subscribe` | POST | ✅ | Push notifications |
| `/v1/ocr` | POST | ✅ | Receipt OCR |

---

## ⚠️ Known Issues & Limitations

### Google OAuth
| Issue | Status | Details |
|-------|--------|---------|
| **Not Configured** | 📋 Expected | `GOOGLE_CLIENT_ID` is set to placeholder in `.env` |
| Backend Endpoint | ✅ Implemented | `POST /v1/auth/google` exists in auth.go:397 |
| Frontend Component | ✅ Implemented | `GoogleLogin` from `@react-oauth/google` in LoginPage.tsx |

**To Enable Google OAuth:**
1. Get OAuth credentials from https://console.cloud.google.com/
2. Set `GOOGLE_CLIENT_ID` in `.env`
3. Add authorized redirect URIs
4. Restart backend

### Field Naming Conventions
| Issue | Location | Note |
|-------|----------|------|
| camelCase vs snake_case | Various | Most endpoints use camelCase (Go standard) |
| `refreshToken` | /v1/auth/refresh | Uses camelCase, NOT snake_case |

### Expense Creation Requirements
| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `title` | Yes | string | NOT `description` |
| `amount` | Yes | number | Float, not string |
| `payerId` | Yes | string | UUID of payer |
| `splits` | Yes | object | Map of userId -> amount |

---

## 🚀 Quick Start Commands

```bash
# 1. Start backend
cd backend && go run ./cmd/api

# 2. In another terminal, run tests
cd ~/workspace/github.com/Skufu/PayUp

# API tests
./scripts/api_test_full.sh

# E2E tests  
node scripts/e2e_test.js

# Or full suite with auto-start
./scripts/run_e2e.sh
```

---

## 📝 API Test Scripts Created

| Script | Purpose | Location |
|--------|---------|----------|
| `api_test.sh` | Quick smoke test | `scripts/api_test.sh` |
| `api_test_full.sh` | Full API coverage (11 tests) | `scripts/api_test_full.sh` |
| `e2e_test.js` | End-to-end flow test | `scripts/e2e_test.js` |
| `run_e2e.sh` | Full suite with backend start | `scripts/run_e2e.sh` |

---

## ✅ Conclusion

**PayUp is fully functional!** All core APIs are working:
- ✅ Authentication (register, login, refresh, me)
- ✅ Groups (create, list, join, invite)
- ✅ Expenses (create, list, delete with splits)
- ✅ Balances & Payments
- ✅ Push notifications, OCR, activity feed

**Google OAuth** is implemented but requires configuration (expected behavior).

All tests passing! 🎉
