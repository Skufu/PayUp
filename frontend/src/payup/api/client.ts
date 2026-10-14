export type ApiError = {
  status: number
  message: string
  details?: unknown
  retryAfter?: number // seconds to wait before retry
  rateLimitRemaining?: number
  rateLimitReset?: number // unix timestamp
}

export type Tokens = {
  accessToken: string
  refreshToken: string
}

type ApiRequestInit = RequestInit & { skipAuth?: boolean }

const ACCESS_TOKEN_KEY = 'payup_access_token'
const REFRESH_TOKEN_KEY = 'payup_refresh_token'

// JWT token expiration buffer - refresh if token expires within this window
const TOKEN_EXPIRATION_BUFFER_MS = 2 * 60 * 1000 // 2 minutes

// Exponential backoff configuration for 429 errors
const BACKOFF_INITIAL_DELAY_MS = 500
const BACKOFF_MAX_DELAY_MS = 30000
const BACKOFF_MAX_RETRIES = 3

// Token storage using sessionStorage for access token (cleared on tab close)
// and localStorage for refresh token (persists for re-authentication)
export function loadTokens(): Tokens | null {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

  // If we have a refresh token but no access token, we can still authenticate
  if (!accessToken && !refreshToken) return null

  return {
    accessToken: accessToken || '',
    refreshToken: refreshToken || '',
  }
}

export function saveTokens(t: Tokens | null) {
  if (!t) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    return
  }
  if (t.accessToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, t.accessToken)
  }
  if (t.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, t.refreshToken)
  }
}

// Clear all tokens (logout)
export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// Check if user has any authentication
export function hasAuthentication(): boolean {
  return !!(sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY))
}

// JWT utility functions (client-side decoding, no verification)
function decodeJWT(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode base64url payload
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function getTokenExpiration(token: string): number | null {
  const decoded = decodeJWT(token)
  return decoded?.exp ?? null
}

function isTokenExpiringSoon(token: string): boolean {
  const exp = getTokenExpiration(token)
  if (!exp) return true // If we can't decode, assume it's expiring

  const nowSeconds = Date.now() / 1000
  const bufferSeconds = TOKEN_EXPIRATION_BUFFER_MS / 1000
  return exp <= (nowSeconds + bufferSeconds)
}

function baseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  // Default to relative URLs so Vite proxy can handle local dev without CORS.
  return (v && v.trim()) || ''
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = undefined
  try {
    body = await res.json()
  } catch {
    // ignore
  }
  const msg = (() => {
    if (typeof body === 'object' && body !== null) {
      const rec = body as Record<string, unknown>
      if (typeof rec.error === 'string' && rec.error.trim()) return rec.error
    }
    return res.statusText || 'Request failed'
  })()

  // Extract rate limit headers
  const retryAfter = res.headers.get('Retry-After')
  const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining')
  const rateLimitReset = res.headers.get('X-RateLimit-Reset')

  return {
    status: res.status,
    message: msg,
    details: body,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
    rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : undefined,
    rateLimitReset: rateLimitReset ? parseInt(rateLimitReset, 10) : undefined,
  }
}

// Exponential backoff with jitter
function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    BACKOFF_INITIAL_DELAY_MS * Math.pow(2, attempt),
    BACKOFF_MAX_DELAY_MS
  )
  // Add random jitter (0-50% of delay)
  const jitter = Math.random() * delay * 0.5
  return delay + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Refresh coordination - prevents concurrent refresh attempts across tabs/requests
let refreshPromise: Promise<Tokens> | null = null

async function performRefresh(): Promise<Tokens> {
  const tok = loadTokens()
  if (!tok?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const refreshed = await rawRequest<{ token: { accessToken: string; refreshToken: string } }>(
    `/v1/auth/refresh`,
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tok.refreshToken }),
      skipAuth: true,
    }
  )

  const newTokens = {
    accessToken: refreshed.token.accessToken,
    refreshToken: refreshed.token.refreshToken,
  }
  saveTokens(newTokens)
  return newTokens
}

async function ensureFreshToken(): Promise<Tokens | null> {
  // If refresh is already in progress, wait for it
  if (refreshPromise) {
    try {
      return await refreshPromise
    } catch {
      return null
    }
  }

  const tok = loadTokens()
  if (!tok) return null

  // Check if access token is expiring soon
  if (tok.accessToken && !isTokenExpiringSoon(tok.accessToken)) {
    return tok // Token is still fresh
  }

  // No refresh token available
  if (!tok.refreshToken) {
    clearTokens()
    return null
  }

  // Start refresh
  refreshPromise = performRefresh()
  try {
    const newTokens = await refreshPromise
    return newTokens
  } catch (e) {
    // Refresh failed, clear tokens
    clearTokens()
    throw e
  } finally {
    refreshPromise = null
  }
}

async function rawRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const url = `${baseUrl()}${path}`

  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (!init.skipAuth) {
    const tok = loadTokens()
    if (tok?.accessToken) headers.set('Authorization', `Bearer ${tok.accessToken}`)
  }

  const res = await fetch(url, { ...init, headers })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  // Skip proactive/reactive refresh for the refresh endpoint itself and public auth flows.
  const isRefreshEndpoint = path.includes('/auth/refresh')
  const shouldUseAuth = !init.skipAuth && !isRefreshEndpoint

  // PROACTIVE REFRESH: Check if token is expiring soon and refresh before request
  if (shouldUseAuth) {
    try {
      await ensureFreshToken()
    } catch {
      // Proactive refresh failed, but continue with request
      // Reactive 401 handling will catch it if needed
    }
  }

  // Make the request with exponential backoff for 429 errors
  let lastError: ApiError | null = null
  for (let attempt = 0; attempt <= BACKOFF_MAX_RETRIES; attempt++) {
    try {
      return await rawRequest<T>(path, init)
    } catch (e) {
      const err = e as ApiError
      lastError = err

      // Handle 429 (rate limit exceeded) with exponential backoff
      if (err?.status === 429 && attempt < BACKOFF_MAX_RETRIES) {
        const backoffMs = err.retryAfter
          ? err.retryAfter * 1000 // Use server-provided Retry-After if available
          : calculateBackoff(attempt)

        await sleep(backoffMs)
        continue // Retry the request
      }

      // Handle 401 (unauthorized) - REACTIVE REFRESH as fallback
      if (err?.status === 401 && shouldUseAuth) {
        const tok = loadTokens()
        if (!tok?.refreshToken) {
          clearTokens()
          throw err
        }

        try {
          // Attempt refresh once (reactive fallback)
          await ensureFreshToken()
          // Retry the original request with new token
          return await rawRequest<T>(path, init)
        } catch {
          // Refresh failed, clear tokens
          clearTokens()
          throw err
        }
      }

      // For all other errors, throw immediately
      throw err
    }
  }

  // Max retries exceeded
  throw lastError || new Error('Max retries exceeded')
}
