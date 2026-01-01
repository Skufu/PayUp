/**
 * Receipt OCR utilities using Tesseract.js with image preprocessing
 * Optimized for Philippine receipt formats
 */

import Tesseract from 'tesseract.js'

export interface OCRResult {
    text: string
    confidence: number
    lines: string[]
}

export interface OCRProgress {
    status: string
    progress: number
}

/**
 * Preprocess image for better OCR accuracy
 * Uses canvas-based processing (lighter than OpenCV)
 */
export async function preprocessImage(
    imageSource: File | Blob | string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Could not get canvas context'))
                return
            }

            // Upscale small images for better OCR
            const minWidth = 1000
            const scale = img.width < minWidth ? minWidth / img.width : 1
            canvas.width = img.width * scale
            canvas.height = img.height * scale

            // Draw original image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Get image data for processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            // Step 1: Convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                data[i] = gray
                data[i + 1] = gray
                data[i + 2] = gray
            }

            // Step 2: Increase contrast
            const contrast = 1.5 // Contrast multiplier
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
            }

            // Step 3: Otsu's binarization for clean B&W
            const histogram = new Array(256).fill(0)
            for (let i = 0; i < data.length; i += 4) {
                histogram[Math.floor(data[i])]++
            }

            const totalPixels = data.length / 4
            let sum = 0
            for (let i = 0; i < 256; i++) sum += i * histogram[i]

            let sumB = 0
            let wB = 0
            let maxVariance = 0
            let threshold = 128

            for (let t = 0; t < 256; t++) {
                wB += histogram[t]
                if (wB === 0) continue
                const wF = totalPixels - wB
                if (wF === 0) break

                sumB += t * histogram[t]
                const mB = sumB / wB
                const mF = (sum - sumB) / wF
                const variance = wB * wF * (mB - mF) * (mB - mF)

                if (variance > maxVariance) {
                    maxVariance = variance
                    threshold = t
                }
            }

            // Apply threshold
            for (let i = 0; i < data.length; i += 4) {
                const value = data[i] > threshold ? 255 : 0
                data[i] = value
                data[i + 1] = value
                data[i + 2] = value
            }

            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }

        img.onerror = () => reject(new Error('Failed to load image'))

        if (imageSource instanceof File || imageSource instanceof Blob) {
            img.src = URL.createObjectURL(imageSource)
        } else {
            img.src = imageSource
        }
    })
}

/**
 * Alternative preprocessing with higher contrast
 * Used in multi-pass OCR for difficult receipts
 */
export async function preprocessImageHighContrast(
    imageSource: File | Blob | string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Could not get canvas context'))
                return
            }

            const scale = img.width < 1500 ? 1500 / img.width : 1
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            // More aggressive contrast
            const contrast = 2.5
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))

            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128))
                const value = adjusted > 128 ? 255 : 0
                data[i] = value
                data[i + 1] = value
                data[i + 2] = value
            }

            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }

        img.onerror = () => reject(new Error('Failed to load image'))

        if (imageSource instanceof File || imageSource instanceof Blob) {
            img.src = URL.createObjectURL(imageSource)
        } else {
            img.src = imageSource
        }
    })
}

/**
 * Perform OCR on an image using Tesseract.js
 */
export async function performOCR(
    imageSource: File | Blob | string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    onProgress?.({ status: 'Preprocessing image...', progress: 0 })

    // Standard preprocessing
    const processedImage = await preprocessImage(imageSource)
    onProgress?.({ status: 'Initializing OCR engine...', progress: 20 })

    const result = await Tesseract.recognize(processedImage, 'eng', {
        logger: (m) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                onProgress?.({
                    status: 'Reading receipt...',
                    progress: 20 + m.progress * 60,
                })
            }
        },
    })

    // Apply custom parameters
    // Note: Some params need to be set via worker - this is a simplified version

    const text = result.data.text
    const confidence = result.data.confidence
    const lines = text.split('\n').filter((line) => line.trim())

    onProgress?.({ status: 'Processing complete', progress: 100 })

    return { text, confidence, lines }
}

/**
 * Multi-pass OCR for difficult receipts
 * Tries different preprocessing methods to get best result
 */
export async function multiPassOCR(
    imageSource: File | Blob | string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    onProgress?.({ status: 'Scanning receipt (Pass 1)...', progress: 0 })

    // Pass 1: Standard preprocessing
    const pass1 = await performOCR(imageSource, (p) => {
        onProgress?.({ status: p.status, progress: p.progress * 0.4 })
    })

    if (pass1.confidence >= 80) {
        return pass1
    }

    onProgress?.({ status: 'Trying enhanced scan (Pass 2)...', progress: 40 })

    // Pass 2: High contrast preprocessing
    const processedImage = await preprocessImageHighContrast(imageSource)
    const pass2Result = await Tesseract.recognize(processedImage, 'eng', {
        logger: (m) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                onProgress?.({
                    status: 'Enhanced scanning...',
                    progress: 40 + m.progress * 40,
                })
            }
        },
    })

    const pass2: OCRResult = {
        text: pass2Result.data.text,
        confidence: pass2Result.data.confidence,
        lines: pass2Result.data.text.split('\n').filter((line) => line.trim()),
    }

    onProgress?.({ status: 'Selecting best result...', progress: 90 })

    // Return the result with higher confidence
    const best = pass1.confidence >= pass2.confidence ? pass1 : pass2

    onProgress?.({ status: 'Complete', progress: 100 })
    return best
}
