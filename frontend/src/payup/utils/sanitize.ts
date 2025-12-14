/**
 * XSS Protection utilities for sanitizing user input.
 *
 * Note: React already escapes content by default when using {variable}.
 * These utilities are for cases where you need extra protection or
 * when using dangerouslySetInnerHTML.
 */

/**
 * Escapes HTML special characters to prevent XSS.
 * Use this when you need to display user input that might contain HTML.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Strips all HTML tags from a string.
 * Use this to get plain text from potentially HTML content.
 */
export function stripHtml(html: string): string {
  // Create a temporary div to parse HTML and extract text
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }
  // Fallback for SSR: simple regex strip
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Validates and sanitizes a URL.
 * Only allows http/https protocols to prevent javascript: XSS.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    // Only allow safe protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
    return ''
  } catch {
    // Invalid URL
    return ''
  }
}

/**
 * Validates that a URL is safe to use (http/https only).
 */
export function isValidUrl(url: string): boolean {
  return sanitizeUrl(url) !== ''
}

/**
 * Sanitizes user input for display.
 * Trims whitespace and escapes HTML.
 */
export function sanitizeInput(input: string): string {
  return escapeHtml(input.trim())
}

/**
 * Truncates a string to a maximum length and adds ellipsis.
 * Safe to use with user input.
 */
export function truncate(str: string, maxLength: number): string {
  const sanitized = str.trim()
  if (sanitized.length <= maxLength) return sanitized
  return sanitized.slice(0, maxLength - 3) + '...'
}
