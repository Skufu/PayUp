/**
 * Receipt OCR utilities using backend Gemini proxy
 * Optimized for Philippine receipt formats (thermal paper)
 */

import { apiRequest } from '../api/client'

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
// OCR FUNCTIONS
// ============================================================================

/**
 * Perform OCR on an image via backend Gemini proxy
 */
export async function performOCR(
    imageSource: File | Blob | string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    onProgress?.({ status: 'Preparing image...', progress: 0 })

    // Get the data URL for the image
    const orientedDataUrl = await correctImageOrientation(imageSource)
    onProgress?.({ status: 'Sending to server...', progress: 20 })

    onProgress?.({ status: 'Reading receipt...', progress: 40 })

    // Call backend OCR proxy instead of Gemini SDK directly
    const result = await apiRequest<{ text: string; confidence: number }>('/v1/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: orientedDataUrl }),
    })

    onProgress?.({ status: 'Processing result...', progress: 80 })

    const text = result.text.trim()
    const lines = text.split('\n').filter((line: string) => line.trim())
    const confidence = result.confidence * 100 // backend returns 0-1 range

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
