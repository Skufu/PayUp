/**
 * Receipt OCR utilities using Google Gemini Vision API
 * Optimized for Philippine receipt formats (thermal paper)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface OCRResult {
    text: string
    confidence: number
    lines: string[]
}

export interface OCRProgress {
    status: string
    progress: number
}

// ============================================================================
// GEMINI CLIENT
// ============================================================================

function getGeminiClient() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string
    if (!apiKey) {
        throw new Error(
            'Missing VITE_GEMINI_API_KEY environment variable. ' +
            'Get a free API key at https://aistudio.google.com/apikey'
        )
    }
    return new GoogleGenerativeAI(apiKey)
}

// ============================================================================
// EXIF ORIENTATION HANDLING
// ============================================================================

/**
 * Read EXIF orientation from image file
 * Parses the first 64KB to find EXIF header and orientation tag
 */
async function getExifOrientation(file: Blob): Promise<number> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file.slice(0, 65536))

        reader.onload = () => {
            const view = new DataView(reader.result as ArrayBuffer)

            if (view.getUint16(0, false) !== 0xFFD8) {
                resolve(1)
                return
            }

            let offset = 2
            const length = view.byteLength

            while (offset < length) {
                if (view.getUint8(offset) !== 0xFF) {
                    resolve(1)
                    return
                }

                const marker = view.getUint8(offset + 1)

                if (marker === 0xE1) {
                    const exifOffset = offset + 4

                    if (view.getUint32(exifOffset, false) !== 0x45786966) {
                        resolve(1)
                        return
                    }

                    const tiffOffset = exifOffset + 6
                    const littleEndian = view.getUint16(tiffOffset, false) === 0x4949
                    const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian) + tiffOffset
                    const numEntries = view.getUint16(ifdOffset, littleEndian)

                    for (let i = 0; i < numEntries; i++) {
                        const entryOffset = ifdOffset + 2 + i * 12
                        const tag = view.getUint16(entryOffset, littleEndian)

                        if (tag === 0x0112) {
                            const orientation = view.getUint16(entryOffset + 8, littleEndian)
                            resolve(orientation)
                            return
                        }
                    }

                    resolve(1)
                    return
                }

                if (marker === 0xD8 || marker === 0xD9) {
                    offset += 2
                } else {
                    offset += 2 + view.getUint16(offset + 2, false)
                }
            }

            resolve(1)
        }

        reader.onerror = () => resolve(1)
    })
}

/**
 * Correct image orientation based on EXIF metadata
 * Returns a data URL of the correctly oriented image
 */
async function correctImageOrientation(imageSource: File | Blob | string): Promise<string> {
    if (typeof imageSource === 'string') {
        return imageSource
    }

    const orientation = await getExifOrientation(imageSource)

    if (orientation === 1) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read image'))
            reader.readAsDataURL(imageSource)
        })
    }

    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Could not get canvas context'))
                return
            }

            if (orientation === 6 || orientation === 8) {
                canvas.width = img.height
                canvas.height = img.width
            } else {
                canvas.width = img.width
                canvas.height = img.height
            }

            switch (orientation) {
                case 3:
                    ctx.translate(canvas.width, canvas.height)
                    ctx.rotate(Math.PI)
                    break
                case 6:
                    ctx.translate(canvas.width, 0)
                    ctx.rotate(Math.PI / 2)
                    break
                case 8:
                    ctx.translate(0, canvas.height)
                    ctx.rotate(-Math.PI / 2)
                    break
            }

            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/jpeg', 0.95))
        }

        img.onerror = () => reject(new Error('Failed to load image for orientation correction'))

        const reader = new FileReader()
        reader.onload = () => { img.src = reader.result as string }
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(imageSource)
    })
}

// ============================================================================
// IMAGE CONVERSION UTILITIES
// ============================================================================

/**
 * Convert an image source (File, Blob, or data URL) to a base64 string
 * and MIME type for the Gemini API
 */
async function imageToBase64(imageSource: File | Blob | string): Promise<{ base64: string; mimeType: string }> {
    // Correct orientation first (fixes iOS photos)
    const orientedDataUrl = await correctImageOrientation(imageSource)

    // Extract base64 and mime from data URL
    const match = orientedDataUrl.match(/^data:(.+?);base64,(.+)$/)
    if (match) {
        return { mimeType: match[1], base64: match[2] }
    }

    // If it's a plain URL/blob URL, fetch and convert
    const response = await fetch(orientedDataUrl)
    const blob = await response.blob()
    const mimeType = blob.type || 'image/jpeg'

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            const b64Match = result.match(/^data:.+?;base64,(.+)$/)
            if (b64Match) {
                resolve({ base64: b64Match[1], mimeType })
            } else {
                reject(new Error('Failed to convert image to base64'))
            }
        }
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(blob)
    })
}

// ============================================================================
// OCR FUNCTIONS
// ============================================================================

const OCR_PROMPT = `You are an OCR engine. Extract ALL text from this receipt image exactly as it appears.
Output ONLY the raw text content, preserving the original layout and line breaks.
Do NOT add any commentary, headers, or formatting. Do NOT translate or interpret abbreviations.
Preserve spacing between columns (item names and prices).
If text is unclear, make your best guess at the characters.`

/**
 * Perform OCR on an image using Google Gemini Vision API
 */
export async function performOCR(
    imageSource: File | Blob | string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    onProgress?.({ status: 'Preparing image...', progress: 0 })

    const { base64, mimeType } = await imageToBase64(imageSource)
    onProgress?.({ status: 'Sending to Gemini...', progress: 20 })

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    onProgress?.({ status: 'Reading receipt...', progress: 40 })

    const result = await model.generateContent([
        OCR_PROMPT,
        {
            inlineData: {
                data: base64,
                mimeType,
            },
        },
    ])

    onProgress?.({ status: 'Processing result...', progress: 80 })

    const response = result.response
    const text = response.text().trim()
    const lines = text.split('\n').filter((line: string) => line.trim())

    // Gemini doesn't provide a confidence score, so we estimate based on content
    const confidence = estimateConfidence(text)

    onProgress?.({ status: 'Processing complete', progress: 100 })

    return { text, confidence, lines }
}

/**
 * Multi-pass OCR for difficult receipts
 * With Gemini, a single pass is usually sufficient, but we keep this
 * function for backward compatibility with ReceiptScanner.tsx
 */
export async function multiPassOCR(
    imageSource: File | Blob | string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    // Gemini's vision model is powerful enough that multi-pass isn't needed
    return performOCR(imageSource, onProgress)
}

// ============================================================================
// CONFIDENCE ESTIMATION
// ============================================================================

/**
 * Estimate OCR confidence based on extracted text content
 * Since Gemini doesn't provide a confidence score, we use heuristics
 */
function estimateConfidence(text: string): number {
    if (!text || text.length < 10) return 10

    let score = 70 // Base score - Gemini is generally reliable

    // Boost if we find receipt-like patterns
    if (/total/i.test(text)) score += 10
    if (/\d+\.\d{2}/.test(text)) score += 5        // Has prices
    if (/vat|tax/i.test(text)) score += 5           // Has tax info
    if (/subtotal|sub\s*total/i.test(text)) score += 5
    if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) score += 5 // Has date

    return Math.min(100, score)
}
