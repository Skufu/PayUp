import imageCompression from 'browser-image-compression'

export type ImageType = 'avatar' | 'qr' | 'proof'

interface CompressionOptions {
    maxSizeMB: number
    maxWidthOrHeight: number
    useWebWorker: boolean
    fileType?: string
}

const COMPRESSION_CONFIGS: Record<ImageType, CompressionOptions> = {
    avatar: {
        maxSizeMB: 0.2, // 200KB max for avatars
        maxWidthOrHeight: 400, // 400x400 max
        useWebWorker: true,
        fileType: 'image/jpeg', // Convert to JPEG for smaller size
    },
    qr: {
        maxSizeMB: 0.5, // 500KB max for QR codes
        maxWidthOrHeight: 1000, // 1000x1000 max
        useWebWorker: true,
        fileType: 'image/png', // Keep PNG for QR readability
    },
    proof: {
        maxSizeMB: 1, // 1MB max for payment proofs
        maxWidthOrHeight: 1600, // 1600px max
        useWebWorker: true,
        fileType: 'image/jpeg',
    },
}

/**
 * Compresses an image file for upload.
 * Automatically resizes and compresses based on the image type.
 *
 * @param file - The original image file
 * @param type - The type of image (avatar, qr, proof)
 * @param onProgress - Optional progress callback (0-100)
 * @returns The compressed file
 */
export async function compressImage(
    file: File,
    type: ImageType,
    onProgress?: (progress: number) => void
): Promise<File> {
    // Skip compression for already small files
    const config = COMPRESSION_CONFIGS[type]
    const maxBytes = config.maxSizeMB * 1024 * 1024

    // Check if file needs compression
    if (file.size <= maxBytes) {
        // Still might need resizing - let the library handle it
    }

    try {
        const compressedFile = await imageCompression(file, {
            ...config,
            onProgress: onProgress ? (p) => onProgress(Math.round(p)) : undefined,
        })

        // Create a new file with original name but possibly different extension
        const extension = config.fileType === 'image/png' ? '.png' : '.jpg'
        const newName = file.name.replace(/\.[^/.]+$/, '') + extension

        return new File([compressedFile], newName, {
            type: config.fileType || compressedFile.type,
            lastModified: Date.now(),
        })
    } catch (error) {
        console.error('Image compression failed:', error)
        // Return original file if compression fails
        return file
    }
}

/**
 * Formats bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
