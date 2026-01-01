import { useRef, useCallback, useState } from 'react'

type SwipeableModalOptions = {
    onClose: () => void
    threshold?: number // percentage of modal height to trigger close (default: 25%)
    enabled?: boolean
}

type SwipeState = {
    isDragging: boolean
    translateY: number
    startY: number
}

export function useSwipeableModal({ onClose, threshold = 25, enabled = true }: SwipeableModalOptions) {
    const modalRef = useRef<HTMLDivElement>(null)
    const [swipeState, setSwipeState] = useState<SwipeState>({
        isDragging: false,
        translateY: 0,
        startY: 0,
    })
    const [isClosing, setIsClosing] = useState(false)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!enabled) return

        // Only start swipe from the drag handle area or header
        const target = e.target as HTMLElement
        const isDragHandle = target.closest('[data-drag-handle]')

        if (isDragHandle) {
            setSwipeState({
                isDragging: true,
                translateY: 0,
                startY: e.touches[0].clientY,
            })
        }
    }, [enabled])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swipeState.isDragging || !enabled) return

        const currentY = e.touches[0].clientY
        const deltaY = currentY - swipeState.startY

        // Only allow dragging downward (positive deltaY)
        if (deltaY > 0) {
            setSwipeState(prev => ({
                ...prev,
                translateY: deltaY,
            }))
        }
    }, [swipeState.isDragging, swipeState.startY, enabled])

    const handleTouchEnd = useCallback(() => {
        if (!swipeState.isDragging || !enabled) return

        const modalHeight = modalRef.current?.offsetHeight || 0
        const thresholdPx = (threshold / 100) * modalHeight

        if (swipeState.translateY > thresholdPx) {
            // Close the modal with animation
            setIsClosing(true)
            setTimeout(() => {
                onClose()
                setIsClosing(false)
                setSwipeState({
                    isDragging: false,
                    translateY: 0,
                    startY: 0,
                })
            }, 250) // Match animation duration
        } else {
            // Snap back
            setSwipeState({
                isDragging: false,
                translateY: 0,
                startY: 0,
            })
        }
    }, [swipeState.isDragging, swipeState.translateY, threshold, onClose, enabled])

    // Mouse support for desktop testing
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!enabled) return

        const target = e.target as HTMLElement
        const isDragHandle = target.closest('[data-drag-handle]')

        if (isDragHandle) {
            e.preventDefault()
            setSwipeState({
                isDragging: true,
                translateY: 0,
                startY: e.clientY,
            })
        }
    }, [enabled])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!swipeState.isDragging || !enabled) return

        const currentY = e.clientY
        const deltaY = currentY - swipeState.startY

        if (deltaY > 0) {
            setSwipeState(prev => ({
                ...prev,
                translateY: deltaY,
            }))
        }
    }, [swipeState.isDragging, swipeState.startY, enabled])

    const handleMouseUp = useCallback(() => {
        if (!swipeState.isDragging || !enabled) return
        handleTouchEnd()
    }, [swipeState.isDragging, enabled, handleTouchEnd])

    const handleMouseLeave = useCallback(() => {
        if (swipeState.isDragging) {
            handleTouchEnd()
        }
    }, [swipeState.isDragging, handleTouchEnd])

    const getModalStyle = useCallback((): React.CSSProperties => {
        if (isClosing) {
            return {
                transform: 'translateY(100%)',
                opacity: 0,
                transition: 'transform 0.25s ease-out, opacity 0.25s ease-out',
            }
        }

        if (swipeState.translateY > 0) {
            return {
                transform: `translateY(${swipeState.translateY}px)`,
                transition: swipeState.isDragging ? 'none' : 'transform 0.25s ease-out',
            }
        }

        return {}
    }, [swipeState.translateY, swipeState.isDragging, isClosing])

    const getBackdropStyle = useCallback((): React.CSSProperties => {
        if (isClosing) {
            return { opacity: 0, transition: 'opacity 0.25s ease-out' }
        }

        if (swipeState.translateY > 0) {
            const modalHeight = modalRef.current?.offsetHeight || 500
            const opacity = 1 - (swipeState.translateY / modalHeight) * 0.5
            return {
                opacity: Math.max(0.5, opacity),
                transition: swipeState.isDragging ? 'none' : 'opacity 0.25s ease-out',
            }
        }

        return {}
    }, [swipeState.translateY, swipeState.isDragging, isClosing])

    return {
        modalRef,
        isDragging: swipeState.isDragging,
        translateY: swipeState.translateY,
        isClosing,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
        },
        getModalStyle,
        getBackdropStyle,
    }
}
