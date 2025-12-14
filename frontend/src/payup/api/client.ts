export type ApiError = {
  status: number
  message: string
  details?: unknown
}

export type Tokens = {
  accessToken: string
  refreshToken: string
}

const LS_KEY = 'payup_tokens_v1'

export function loadTokens(): Tokens | null {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Tokens
  } catch {
    localStorage.removeItem(LS_KEY)
    return null
  }
}

export function saveTokens(t: Tokens | null) {
  if (!t) {
    localStorage.removeItem(LS_KEY)
    return
  }
  localStorage.setItem(LS_KEY, JSON.stringify(t))
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

    const refreshed = await rawRequest<{ token: { accessToken: string; refreshToken: string } }>(`/v1/auth/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tok.refreshToken }),
      skipAuth: true,
    })
    saveTokens({ accessToken: refreshed.token.accessToken, refreshToken: refreshed.token.refreshToken })

    return await rawRequest<T>(path, init)
  }
}

