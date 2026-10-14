# PayUp User Testing Guide

> Knowledge repository for validation testing of PayUp application.

---

## Validation Concurrency

### Documentation Verification (Static Checks)

**Max concurrent validators: 5**

Documentation verification assertions use static file tools (Read, LS, Grep, Glob) that don't require:
- Running services
- Browser automation
- Interactive user sessions

These checks can run concurrently without resource contention since they only read files.

### Interactive Testing (Browser/TUI)

**Max concurrent validators: 1**

For assertions requiring browser automation or interactive testing, use single validator to avoid:
- State conflicts between sessions
- Database race conditions
- Service resource contention

---

## Flow Validator Guidance: Documentation Verification

### Isolation Rules

- No isolation needed for documentation verification
- All validators can read the same files concurrently
- No shared state is modified during verification

### Testing Tools

For documentation accuracy assertions, use:

| Tool | Use Case |
|------|----------|
| `Read` | Read documentation files and source code |
| `LS` | Verify directory structure matches documentation |
| `Grep` | Search for patterns in source files |
| `Glob` | Find files matching patterns |

### Assertion Types

1. **File existence checks**: Verify paths in documentation exist
2. **Version comparisons**: Match documented versions with package.json/go.mod
3. **Code structure comparisons**: Compare documented structure with actual files
4. **Configuration comparisons**: Match documented config with implementation

---

## Testing Surfaces

### Backend Documentation (BACKEND.md)

Assertions: VAL-BACK-001 through VAL-BACK-005

Key files to compare:
- `backend/internal/server/server.go` - Middleware order, route registration
- `backend/internal/middleware/ratelimit.go` - Rate limit values
- `backend/go.mod` - Go version and dependencies
- `backend/internal/handlers/*.go` - Handler files existence

### Frontend Documentation (FRONTEND.md)

Assertions: VAL-FRONT-001 through VAL-FRONT-005

Key files to compare:
- `frontend/src/App.tsx` - Route definitions
- `frontend/src/payup/api/client.ts` - Token storage implementation
- `frontend/package.json` - Dependency versions
- `frontend/src/payup/hooks/*.ts` - Hook files existence
- `frontend/src/payup/components/modals/*.tsx` - Modal components

---

## Known Issues (Do Not Fix)

These are code/documentation discrepancies that require code changes:

1. **Windows file URLs in documentation** - BACKEND.md and FRONTEND.md have `file:///c:/...` URLs in See Also sections. This is a documentation formatting issue for ops-docs milestone (VAL-DEPLOY-004).

---

## Environment Notes

- **No services required** for documentation verification
- **No data seeding needed** - static file comparison only
- **No browser automation** - use file tools directly
