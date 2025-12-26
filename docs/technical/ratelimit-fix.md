Proactive Token Refresh with Rate Limiting Fix
Problem Analysis
The current implementation uses reactive refresh (waiting for 401 errors), which causes:

Multiple API calls fail with 401 simultaneously when tokens expire
Each 401 triggers a separate refresh attempt
Multiple browser tabs/windows trigger concurrent refreshes
After 5 refresh attempts (shared with login), users get locked out for 15 minutes
Solution: Proactive Token Refresh
Instead of waiting for 401 errors, check token expiration before making requests and refresh proactively.

Implementation
Backend Changes
1. Separate Rate Limits (backend/internal/middleware/ratelimit.go)
Add RefreshRateLimit(): 30 attempts per 15 minutes (vs 5 for login/register)
Add rate limit headers: Include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset in all rate limit responses
Update AuthRateLimit(): Add rate limit headers to existing function
2. Apply Rate Limits (backend/internal/server/server.go)
Keep AuthRateLimit() (5/15min) for /login, /register, /google
Apply RefreshRateLimit() (30/15min) specifically to /v1/auth/refresh
This prevents refresh attempts from consuming login attempt quota
Frontend Changes
3. JWT Token Utilities (frontend/src/payup/api/client.ts)
Add JWT decoding function: Parse JWT without verification to extract expiration time
Add isTokenExpiringSoon(): Check if token expires within 2 minutes (configurable buffer)
Add getTokenExpiration(): Extract expiration timestamp from JWT payload
4. Proactive Refresh Logic (frontend/src/payup/api/client.ts)
Before each request: Check if access token is expiring soon
If expiring: Refresh proactively before making the request
Refresh coordination: Use module-level promise to prevent concurrent refreshes
If refresh is in progress, queue requests to wait for it
If refresh fails, reject all queued requests
If refresh succeeds, retry all queued requests with new token
5. Enhanced Error Handling (frontend/src/payup/api/client.ts)
429 error handling: 
Respect Retry-After header
Implement exponential backoff with jitter for retries
Don't retry refresh on 429 - clear tokens and fail gracefully
Fallback to reactive refresh: If proactive refresh fails, still handle 401 errors as fallback
Rate limit header parsing: Extract and use X-RateLimit-* headers for better UX
Technical Details
JWT Decoding (Frontend)
Decode JWT base64 payload without verification (we only need expiration time)
No JWT library needed - simple base64 decode and JSON parse
Check exp claim against current time + buffer (2 minutes)
Refresh Coordination Pattern
let refreshPromise: Promise<Tokens> | null = null

async function ensureFreshToken(): Promise<Tokens> {
  if (refreshPromise) return refreshPromise
  
  refreshPromise = performRefresh()
  try {
    const tokens = await refreshPromise
    return tokens
  } finally {
    refreshPromise = null
  }
}
Rate Limit Headers (Backend)
X-RateLimit-Limit: Maximum requests allowed (e.g., "30")
X-RateLimit-Remaining: Requests remaining (e.g., "15")
X-RateLimit-Reset: Unix timestamp when limit resets
Retry-After: Seconds to wait (already implemented)
Exponential Backoff (Frontend)
Initial delay: 500ms
Max delay: 30 seconds
Jitter: Random 0-50% of delay
Max retries: 3 for 429 errors
Files to Modify
backend/internal/middleware/ratelimit.go
Add RefreshRateLimit() function
Add rate limit header helpers
Update existing rate limiters to include headers
backend/internal/server/server.go
Apply RefreshRateLimit() to /v1/auth/refresh
Keep AuthRateLimit() for other auth endpoints
frontend/src/payup/api/client.ts
Add JWT decoding utilities
Add proactive refresh logic
Add refresh coordination
Enhance error handling with exponential backoff
Parse and use rate limit headers
Success Criteria
✅ Tokens refresh proactively before expiration (no 401 cascades)
✅ Multiple concurrent requests share a single refresh attempt
✅ Refresh endpoint has separate, more lenient rate limits (30/15min)
✅ Login/register endpoints remain protected (5/15min)
✅ 429 errors handled gracefully with exponential backoff
✅ Rate limit headers provide transparency to clients
✅ Multiple tabs/windows don't cause excessive refresh attempts
✅ Fallback reactive refresh still works if proactive fails
Edge Cases Handled
Token expires between check and request (fallback to reactive refresh)
Multiple tabs refreshing simultaneously (coordination prevents duplicates)
Refresh fails with 429 (exponential backoff, don't retry immediately)
Refresh fails with other errors (clear tokens, propagate error)
No access token but has refresh token (proactive refresh on first request)