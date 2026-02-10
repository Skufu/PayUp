/**
 * Unit tests for Receipt OCR utilities (Gemini Vision API)
 * Mocks the Gemini SDK to test OCR logic without real API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// MOCK SETUP - Must be before imports
// ============================================================================

const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
}))

vi.mock('@google/generative-ai', () => {
    // Use a class so it works with `new GoogleGenerativeAI(...)`
    class MockGoogleGenerativeAI {
        getGenerativeModel = mockGetGenerativeModel
    }
    return { GoogleGenerativeAI: MockGoogleGenerativeAI }
})

// Stub the env var so getGeminiClient() doesn't throw
vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key-12345')

import { performOCR, multiPassOCR } from './receiptOCR'

// ============================================================================
// HELPERS
// ============================================================================

function makeGeminiResponse(text: string) {
    return {
        response: {
            text: () => text,
        },
    }
}

const SAMPLE_RECEIPT_TEXT = `JOLLIBEE
VAT REG TIN: 001-234-567

1    SPICY CHJOL ML     169.00
2    YUM                 45.00

VATABLE SALES            191.96
VAT 12%                   23.04
TOTAL                    214.00

CASH TENDERED            500.00
CHANGE                   286.00`

// ============================================================================
// performOCR
// ============================================================================

describe('performOCR', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGenerateContent.mockResolvedValue(makeGeminiResponse(SAMPLE_RECEIPT_TEXT))
    })

    it('should return OCR result with text, confidence, and lines', async () => {
        const result = await performOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.text).toBe(SAMPLE_RECEIPT_TEXT)
        expect(result.lines.length).toBeGreaterThan(0)
        expect(result.confidence).toBeGreaterThan(0)
    })

    it('should call Gemini with the image data', async () => {
        await performOCR('data:image/jpeg;base64,/9j/fakedata123')

        expect(mockGetGenerativeModel).toHaveBeenCalledWith({
            model: 'gemini-2.0-flash',
        })
        expect(mockGenerateContent).toHaveBeenCalledTimes(1)

        // Verify it sends inline image data
        const callArgs = mockGenerateContent.mock.calls[0][0]
        expect(callArgs).toHaveLength(2) // prompt + image
        expect(callArgs[1]).toHaveProperty('inlineData')
        expect(callArgs[1].inlineData).toHaveProperty('data')
        expect(callArgs[1].inlineData).toHaveProperty('mimeType')
    })

    it('should invoke progress callbacks', async () => {
        const onProgress = vi.fn()

        await performOCR('data:image/jpeg;base64,/9j/fake', onProgress)

        expect(onProgress).toHaveBeenCalled()
        // Should start at 0 and end at 100
        const calls = onProgress.mock.calls
        expect(calls[0][0].progress).toBe(0)
        expect(calls[calls.length - 1][0].progress).toBe(100)
    })

    it('should filter empty lines from result', async () => {
        mockGenerateContent.mockResolvedValue(
            makeGeminiResponse('Line 1\n\n\nLine 2\n\n')
        )

        const result = await performOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.lines).toEqual(['Line 1', 'Line 2'])
    })

    it('should propagate API errors', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API rate limit exceeded'))

        await expect(
            performOCR('data:image/jpeg;base64,/9j/fake')
        ).rejects.toThrow('API rate limit exceeded')
    })
})

// ============================================================================
// multiPassOCR
// ============================================================================

describe('multiPassOCR', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGenerateContent.mockResolvedValue(makeGeminiResponse(SAMPLE_RECEIPT_TEXT))
    })

    it('should return the same result as performOCR (single pass)', async () => {
        const result = await multiPassOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.text).toBe(SAMPLE_RECEIPT_TEXT)
        expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    })

    it('should pass progress callback through', async () => {
        const onProgress = vi.fn()

        await multiPassOCR('data:image/jpeg;base64,/9j/fake', onProgress)

        expect(onProgress).toHaveBeenCalled()
    })
})

// ============================================================================
// Confidence estimation
// ============================================================================

describe('confidence estimation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should give high confidence for receipt-like text', async () => {
        mockGenerateContent.mockResolvedValue(
            makeGeminiResponse(SAMPLE_RECEIPT_TEXT)
        )

        const result = await performOCR('data:image/jpeg;base64,/9j/fake')

        // Receipt text has TOTAL, prices, VAT, date patterns → high score
        expect(result.confidence).toBeGreaterThanOrEqual(85)
    })

    it('should give low confidence for non-receipt text', async () => {
        mockGenerateContent.mockResolvedValue(
            makeGeminiResponse('Hello World')
        )

        const result = await performOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.confidence).toBeLessThan(80)
    })

    it('should give very low confidence for empty text', async () => {
        mockGenerateContent.mockResolvedValue(makeGeminiResponse(''))

        const result = await performOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.confidence).toBeLessThanOrEqual(10)
    })
})
