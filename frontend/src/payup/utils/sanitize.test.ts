/**
 * Unit tests for XSS Protection / sanitize utilities
 */

import { describe, it, expect } from 'vitest'
import {
    escapeHtml,
    sanitizeUrl,
    isValidUrl,
    sanitizeInput,
    truncate,
} from './sanitize'

// ============================================================================
// escapeHtml
// ============================================================================

describe('escapeHtml', () => {
    it('should escape ampersands', () => {
        expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
    })

    it('should escape angle brackets', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        )
    })

    it('should escape quotes', () => {
        expect(escapeHtml('"hello" & \'world\'')).toBe(
            '&quot;hello&quot; &amp; &#039;world&#039;'
        )
    })

    it('should return empty string for empty input', () => {
        expect(escapeHtml('')).toBe('')
    })

    it('should not modify safe strings', () => {
        expect(escapeHtml('Hello World 123')).toBe('Hello World 123')
    })

    it('should handle multiple special characters', () => {
        expect(escapeHtml('<div class="a" data-x=\'b\'>&</div>')).toBe(
            '&lt;div class=&quot;a&quot; data-x=&#039;b&#039;&gt;&amp;&lt;/div&gt;'
        )
    })
})

// ============================================================================
// sanitizeUrl
// ============================================================================

describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
        expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
    })

    it('should allow https URLs', () => {
        expect(sanitizeUrl('https://example.com/path?q=1')).toBe(
            'https://example.com/path?q=1'
        )
    })

    it('should reject javascript: URLs', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('')
    })

    it('should reject data: URLs', () => {
        expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    })

    it('should reject ftp: URLs', () => {
        expect(sanitizeUrl('ftp://example.com')).toBe('')
    })

    it('should return empty for empty input', () => {
        expect(sanitizeUrl('')).toBe('')
    })

    it('should return empty for invalid URLs', () => {
        expect(sanitizeUrl('not a url')).toBe('')
    })

    it('should trim whitespace', () => {
        expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com/')
    })
})

// ============================================================================
// isValidUrl
// ============================================================================

describe('isValidUrl', () => {
    it('should return true for https URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true)
    })

    it('should return true for http URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('should return false for javascript: URLs', () => {
        expect(isValidUrl('javascript:void(0)')).toBe(false)
    })

    it('should return false for empty strings', () => {
        expect(isValidUrl('')).toBe(false)
    })

    it('should return false for invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false)
    })
})

// ============================================================================
// sanitizeInput
// ============================================================================

describe('sanitizeInput', () => {
    it('should trim and escape HTML', () => {
        expect(sanitizeInput('  <b>hello</b>  ')).toBe('&lt;b&gt;hello&lt;/b&gt;')
    })

    it('should handle normal text', () => {
        expect(sanitizeInput('Hello World')).toBe('Hello World')
    })

    it('should handle empty input', () => {
        expect(sanitizeInput('  ')).toBe('')
    })

    it('should escape XSS attempts', () => {
        expect(sanitizeInput('<img onerror="alert(1)" src=x>')).toBe(
            '&lt;img onerror=&quot;alert(1)&quot; src=x&gt;'
        )
    })
})

// ============================================================================
// truncate
// ============================================================================

describe('truncate', () => {
    it('should not truncate short strings', () => {
        expect(truncate('hello', 10)).toBe('hello')
    })

    it('should truncate long strings with ellipsis', () => {
        expect(truncate('hello world this is long', 10)).toBe('hello w...')
    })

    it('should handle exact length', () => {
        expect(truncate('hello', 5)).toBe('hello')
    })

    it('should handle very short maxLength', () => {
        expect(truncate('hello world', 4)).toBe('h...')
    })

    it('should trim whitespace first', () => {
        expect(truncate('  hi  ', 10)).toBe('hi')
    })
})
