/**
 * Receipt Scanner Component
 * Camera/upload interface for capturing receipt images
 */

import { Camera, ImageIcon, Loader2, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { compressImage } from '../../utils/imageCompression'
import { multiPassOCR, type OCRProgress } from '../../utils/receiptOCR'
import { parseReceipt, type ParsedReceipt } from '../../utils/receiptParser'

interface Props {
    isOpen: boolean
    onClose: () => void
    onScanComplete: (receipt: ParsedReceipt) => void
}

export function ReceiptScanner({ isOpen, onClose, onScanComplete }: Props) {
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState<OCRProgress | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [showCamera, setShowCamera] = useState(false)

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
        }
        setShowCamera(false)
    }, [stream])

    // Effect to attach stream to video element and play
    // This is needed for iOS Safari which requires explicit play() call
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
            // iOS Safari needs explicit play()
            videoRef.current.play().catch((err) => {
                console.error('Video play failed:', err)
            })
        }
    }, [stream, showCamera])

    const startCamera = async () => {
        try {
            setError(null)
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            })
            setStream(mediaStream)
            setShowCamera(true)
        } catch {
            setError('Could not access camera. Please try uploading an image instead.')
        }
    }

    const captureFromCamera = () => {
        if (!videoRef.current) return

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
            setCapturedImage(dataUrl)
            stopCamera()
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)

        try {
            // Compress if needed
            const compressed = await compressImage(file, 'proof')
            const reader = new FileReader()
            reader.onload = (e) => {
                setCapturedImage(e.target?.result as string)
            }
            reader.readAsDataURL(compressed)
        } catch {
            setError('Failed to load image. Please try again.')
        }
    }

    const processImage = async () => {
        if (!capturedImage) return

        setIsProcessing(true)
        setError(null)
        setProgress({ status: 'Starting...', progress: 0 })

        try {
            const ocrResult = await multiPassOCR(capturedImage, setProgress)

            if (ocrResult.confidence < 30) {
                setError(
                    'Could not read the receipt clearly. Try taking a clearer photo with better lighting.'
                )
                setIsProcessing(false)
                return
            }

            const parsedReceipt = parseReceipt(ocrResult.text)

            if (parsedReceipt.items.length === 0 && parsedReceipt.total === 0) {
                setError(
                    'No items or total found. You can still add items manually or try a different photo.'
                )
            }

            onScanComplete(parsedReceipt)
        } catch (err) {
            console.error('OCR Error:', err)
            setError('Failed to process receipt. Please try again.')
        } finally {
            setIsProcessing(false)
            setProgress(null)
        }
    }

    const reset = () => {
        setCapturedImage(null)
        setError(null)
        setProgress(null)
        stopCamera()
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-lg bg-[#131316] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
                    <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                        <Camera className="text-[#dfff4f]" size={20} />
                        Scan Receipt
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Camera View */}
                    {showCamera && !capturedImage && (
                        <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-4">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {/* Capture guide overlay */}
                            <div className="absolute inset-4 border-2 border-dashed border-[#dfff4f]/50 rounded-xl pointer-events-none" />
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                <button
                                    onClick={captureFromCamera}
                                    className="w-16 h-16 bg-[#dfff4f] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                                >
                                    <Camera size={28} className="text-black" />
                                </button>
                            </div>
                            <button
                                onClick={stopCamera}
                                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70"
                            >
                                <X size={20} className="text-white" />
                            </button>
                        </div>
                    )}

                    {/* Captured Image Preview */}
                    {capturedImage && (
                        <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-4">
                            <img
                                src={capturedImage}
                                alt="Captured receipt"
                                className="w-full h-full object-contain"
                            />
                            {isProcessing && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                                    <Loader2 size={40} className="text-[#dfff4f] animate-spin" />
                                    {progress && (
                                        <>
                                            <p className="text-white text-sm">{progress.status}</p>
                                            <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#dfff4f] transition-all duration-300"
                                                    style={{ width: `${progress.progress}%` }}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {!isProcessing && (
                                <button
                                    onClick={reset}
                                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70"
                                >
                                    <RotateCcw size={20} className="text-white" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Initial State - No image */}
                    {!showCamera && !capturedImage && (
                        <div className="space-y-4">
                            <button
                                onClick={startCamera}
                                className="w-full py-12 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#dfff4f] transition-colors flex flex-col items-center gap-3 group"
                            >
                                <Camera
                                    size={48}
                                    className="text-gray-500 group-hover:text-[#dfff4f] transition-colors"
                                />
                                <span className="text-gray-400 group-hover:text-white transition-colors font-medium">
                                    Take Photo
                                </span>
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-gray-500 text-xs uppercase">or</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-8 rounded-2xl border border-white/10 hover:border-white/30 transition-colors flex items-center justify-center gap-3 bg-white/5"
                            >
                                <ImageIcon size={24} className="text-gray-400" />
                                <span className="text-gray-400 font-medium">Upload Image</span>
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Tips */}
                    {!capturedImage && !showCamera && (
                        <div className="mt-6 p-4 bg-[#dfff4f]/5 border border-[#dfff4f]/20 rounded-xl">
                            <p className="text-[#dfff4f] text-xs font-bold uppercase mb-2">Tips for best results</p>
                            <ul className="text-gray-400 text-xs space-y-1">
                                <li>• Place receipt on a flat, dark surface</li>
                                <li>• Ensure good lighting (avoid shadows)</li>
                                <li>• Keep the full receipt in frame</li>
                                <li>• Hold camera steady to avoid blur</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {capturedImage && !isProcessing && (
                    <div className="p-4 border-t border-white/5 bg-[#1c1c21]">
                        <button
                            onClick={processImage}
                            className="w-full py-4 bg-[#dfff4f] text-black font-bold rounded-xl hover:bg-[#ccee3e] transition-colors flex items-center justify-center gap-2"
                        >
                            <span>SCAN RECEIPT</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
