/**
 * Receipt OCR utilities using Tesseract.js with image preprocessing
 * Optimized for Philippine receipt formats (thermal paper)
 */

import * as Tesseract from 'tesseract.js'

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
 * Apply 3x3 convolution kernel to image data
 */
function applyKernel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    kernel: number[][]
): Uint8ClampedArray {
    const output = new Uint8ClampedArray(data.length)
    const kSize = 3
    const kHalf = Math.floor(kSize / 2)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0
            let kSum = 0

            for (let ky = 0; ky < kSize; ky++) {
                for (let kx = 0; kx < kSize; kx++) {
                    const py = Math.min(height - 1, Math.max(0, y + ky - kHalf))
                    const px = Math.min(width - 1, Math.max(0, x + kx - kHalf))
                    const idx = (py * width + px) * 4
                    sum += data[idx] * kernel[ky][kx]
                    kSum += kernel[ky][kx]
                }
            }

            const idx = (y * width + x) * 4
            const value = kSum !== 0 ? Math.min(255, Math.max(0, sum / kSum)) : Math.min(255, Math.max(0, sum))
            output[idx] = value
            output[idx + 1] = value
            output[idx + 2] = value
            output[idx + 3] = 255
        }
    }

    return output
}

/**
 * Apply sharpening filter for thermal paper text
 */
function sharpenImage(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    // Unsharp mask kernel - enhances edges
    const kernel = [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0],
    ]
    return applyKernel(data, width, height, kernel)
}

/**
 * Apply median filter for noise reduction (good for thermal paper)
 */
function medianFilter(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(data.length)
    const kHalf = 1 // 3x3 window

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const values: number[] = []

            for (let ky = -kHalf; ky <= kHalf; ky++) {
                for (let kx = -kHalf; kx <= kHalf; kx++) {
                    const py = Math.min(height - 1, Math.max(0, y + ky))
                    const px = Math.min(width - 1, Math.max(0, x + kx))
                    values.push(data[(py * width + px) * 4])
                }
            }

            values.sort((a, b) => a - b)
            const median = values[Math.floor(values.length / 2)]
            const idx = (y * width + x) * 4
            output[idx] = median
            output[idx + 1] = median
            output[idx + 2] = median
            output[idx + 3] = 255
        }
    }

    return output
}

/**
 * Calculate adaptive threshold using Gaussian-weighted local mean
 * Better for uneven lighting on thermal receipts
 */
function adaptiveThreshold(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    blockSize: number = 15,
    C: number = 8
): void {
    // Create integral image for fast mean calculation
    const integral = new Float64Array((width + 1) * (height + 1))

    for (let y = 0; y < height; y++) {
        let rowSum = 0
        for (let x = 0; x < width; x++) {
            rowSum += data[(y * width + x) * 4]
            integral[(y + 1) * (width + 1) + (x + 1)] =
                integral[y * (width + 1) + (x + 1)] + rowSum
        }
    }

    // Apply adaptive threshold
    const halfBlock = Math.floor(blockSize / 2)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - halfBlock)
            const y1 = Math.max(0, y - halfBlock)
            const x2 = Math.min(width - 1, x + halfBlock)
            const y2 = Math.min(height - 1, y + halfBlock)

            const count = (x2 - x1 + 1) * (y2 - y1 + 1)
            const sum =
                integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
                integral[(y2 + 1) * (width + 1) + x1] -
                integral[y1 * (width + 1) + (x2 + 1)] +
                integral[y1 * (width + 1) + x1]

            const mean = sum / count
            const idx = (y * width + x) * 4
            const value = data[idx] > mean - C ? 255 : 0

            data[idx] = value
            data[idx + 1] = value
            data[idx + 2] = value
        }
    }
}

/**
 * Enhanced preprocessing for Philippine thermal receipts
 * Uses adaptive thresholding and sharpening
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

            // Upscale to at least 1500px width for better OCR
            const minWidth = 1500
            const scale = img.width < minWidth ? minWidth / img.width : 1
            canvas.width = img.width * scale
            canvas.height = img.height * scale

            // Draw original image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Get image data for processing
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            let data = imageData.data

            // Step 1: Convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                data[i] = gray
                data[i + 1] = gray
                data[i + 2] = gray
            }

            // Step 2: Apply median filter to reduce thermal paper noise
            const filtered = medianFilter(data, canvas.width, canvas.height)
            for (let i = 0; i < data.length; i++) {
                data[i] = filtered[i]
            }

            // Step 3: Apply sharpening to enhance text edges
            const sharpened = sharpenImage(data, canvas.width, canvas.height)
            for (let i = 0; i < data.length; i++) {
                data[i] = sharpened[i]
            }

            // Step 4: Increase contrast
            const contrast = 1.6
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
            }

            // Step 5: Apply adaptive thresholding for uneven lighting
            adaptiveThreshold(data, canvas.width, canvas.height, 21, 10)

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
 * Alternative preprocessing with Otsu's thresholding
 * Used in multi-pass OCR for receipts with more uniform lighting
 */
export async function preprocessImageOtsu(
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

            // Convert to grayscale and apply stronger contrast
            const contrast = 2.0
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100))

            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128))
                data[i] = adjusted
                data[i + 1] = adjusted
                data[i + 2] = adjusted
            }

            // Otsu's binarization
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
 * Perform OCR on an image using Tesseract.js
 */
export async function performOCR(
    imageSource: File | Blob | string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    onProgress?.({ status: 'Preprocessing image...', progress: 0 })

    // Enhanced preprocessing
    const processedImage = await preprocessImage(imageSource)
    onProgress?.({ status: 'Initializing OCR engine...', progress: 20 })

    const result = await Tesseract.recognize(processedImage, 'eng', {
        logger: (m: { status: string; progress?: number }) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                onProgress?.({
                    status: 'Reading receipt...',
                    progress: 20 + m.progress * 60,
                })
            }
        },
    })

    const text = result.data.text
    const confidence = result.data.confidence
    const lines = text.split('\n').filter((line: string) => line.trim())

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
    onProgress?.({ status: 'Scanning receipt (Pass 1 - Adaptive)...', progress: 0 })

    // Pass 1: Adaptive thresholding (better for uneven lighting)
    const pass1 = await performOCR(imageSource, (p) => {
        onProgress?.({ status: p.status, progress: p.progress * 0.45 })
    })

    if (pass1.confidence >= 75) {
        return pass1
    }

    onProgress?.({ status: 'Trying enhanced scan (Pass 2 - Otsu)...', progress: 45 })

    // Pass 2: Otsu's thresholding (better for uniform lighting)
    const processedImage = await preprocessImageOtsu(imageSource)
    const pass2Result = await Tesseract.recognize(processedImage, 'eng', {
        logger: (m: { status: string; progress?: number }) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                onProgress?.({
                    status: 'Enhanced scanning...',
                    progress: 45 + m.progress * 45,
                })
            }
        },
    })

    const pass2: OCRResult = {
        text: pass2Result.data.text,
        confidence: pass2Result.data.confidence,
        lines: pass2Result.data.text.split('\n').filter((line: string) => line.trim()),
    }

    onProgress?.({ status: 'Selecting best result...', progress: 95 })

    // Return the result with higher confidence, or merge if both have items
    const best = pass1.confidence >= pass2.confidence ? pass1 : pass2

    onProgress?.({ status: 'Complete', progress: 100 })
    return best
}
