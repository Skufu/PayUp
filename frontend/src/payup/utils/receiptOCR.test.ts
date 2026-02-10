/**
 * Tests for the receipt OCR utility (backend proxy version)
 * Mocks the apiRequest function to avoid real backend calls
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock apiRequest before importing the module under test
const mockApiRequest = vi.fn()
vi.mock('../api/client', () => ({
    apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

import { performOCR, multiPassOCR } from './receiptOCR'

const SAMPLE_RECEIPT_TEXT = `JOLLIBEE
Store #1234
123 Main St, Manila

Chickenjoy 1pc      175.00
Jolly Spaghetti      75.00
Coke Float           55.00

SUBTOTAL            305.00
VAT (12%)            36.60
TOTAL               341.60

01/15/2025 14:30
Thank you!`

describe('performOCR', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockApiRequest.mockResolvedValue({
            text: SAMPLE_RECEIPT_TEXT,
            confidence: 0.92,
        })
    })

    it('should return OCR result with text, confidence, and lines', async () => {
        const result = await performOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.text).toBe(SAMPLE_RECEIPT_TEXT)
        expect(result.lines.length).toBeGreaterThan(0)
        expect(result.confidence).toBe(92) // 0.92 * 100
    })

    it('should call the backend /v1/ocr endpoint', async () => {
        await performOCR('data:image/jpeg;base64,/9j/fake')

        expect(mockApiRequest).toHaveBeenCalledWith(
            '/v1/ocr',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
        )
    })

    it('should send image data in the request body', async () => {
        const imageData = 'data:image/jpeg;base64,/9j/fake'
        await performOCR(imageData)

        const callArgs = mockApiRequest.mock.calls[0]
        const body = JSON.parse(callArgs[1].body)
        expect(body.imageData).toBe(imageData)
    })

    it('should call progress callback at each stage', async () => {
        const onProgress = vi.fn()
        await performOCR('data:image/jpeg;base64,/9j/fake', onProgress)

        expect(onProgress).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Preparing image...', progress: 0 })
        )
        expect(onProgress).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Sending to server...', progress: 20 })
        )
        expect(onProgress).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Reading receipt...', progress: 40 })
        )
        expect(onProgress).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Processing result...', progress: 80 })
        )
        expect(onProgress).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Processing complete', progress: 100 })
        )
    })

    it('should filter empty lines from the result', async () => {
        mockApiRequest.mockResolvedValue({
            text: 'Line 1\n\n\nLine 2\n  \nLine 3',
            confidence: 0.85,
        })

        const result = await performOCR('data:image/jpeg;base64,/9j/fake')
        expect(result.lines).toEqual(['Line 1', 'Line 2', 'Line 3'])
    })

    it('should propagate API errors', async () => {
        mockApiRequest.mockRejectedValue(new Error('Network error'))

        await expect(performOCR('data:image/jpeg;base64,/9j/fake')).rejects.toThrow('Network error')
    })

    it('should convert confidence from 0-1 to 0-100 range', async () => {
        mockApiRequest.mockResolvedValue({
            text: 'Some text',
            confidence: 0.95,
        })

        const result = await performOCR('data:image/jpeg;base64,/9j/fake')
        expect(result.confidence).toBe(95)
    })
})

describe('multiPassOCR', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockApiRequest.mockResolvedValue({
            text: SAMPLE_RECEIPT_TEXT,
            confidence: 0.92,
        })
    })

    it('should delegate to performOCR (single pass is sufficient)', async () => {
        const result = await multiPassOCR('data:image/jpeg;base64,/9j/fake')

        expect(result.text).toBe(SAMPLE_RECEIPT_TEXT)
        expect(mockApiRequest).toHaveBeenCalledTimes(1)
    })

    it('should pass progress callback through', async () => {
        const onProgress = vi.fn()
        await multiPassOCR('data:image/jpeg;base64,/9j/fake', onProgress)

        expect(onProgress).toHaveBeenCalled()
    })
})
