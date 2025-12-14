export type ApiError = {
  status: number
  message: string
  details?: unknown
}

export type Tokens = {
  accessToken: string
  refreshToken: string
}

const ACCESS_TOKEN_KEY = 'payup_access_token'
const REFRESH_TOKEN_KEY = 'payup_refresh_token'

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
  return { status: res.status, message: msg, details: body }
}

async function rawRequest<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
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

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, init)
  } catch (e) {
    const err = e as ApiError
    if (err?.status !== 401) throw e

    // Attempt refresh once
    const tok = loadTokens()
    if (!tok?.refreshToken) throw e

    try {
      const refreshed = await rawRequest<{ token: { accessToken: string; refreshToken: string } }>(`/v1/auth/refresh`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tok.refreshToken }),
        skipAuth: true,
      })
      saveTokens({ accessToken: refreshed.token.accessToken, refreshToken: refreshed.token.refreshToken })

      return await rawRequest<T>(path, init)
    } catch {
      // Refresh failed, clear tokens
      clearTokens()
      throw e
    }
  }
}
