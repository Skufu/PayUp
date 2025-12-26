import { useCallback, useRef, useState } from 'react'

type UsePullToRefreshOptions = {
    onRefresh: () => Promise<void>
    threshold?: number
    disabled?: boolean
}

export function usePullToRefresh({
    onRefresh,
    threshold = 80,
    disabled = false,
}: UsePullToRefreshOptions) {
    const [isPulling, setIsPulling] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)

    const startY = useRef(0)
    const currentY = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return

        const container = containerRef.current
        if (!container) return

        // Only activate if scrolled to top
        if (container.scrollTop > 0) return

        startY.current = e.touches[0].clientY
        setIsPulling(true)
    }, [disabled, isRefreshing])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling || disabled || isRefreshing) return

        const container = containerRef.current
        if (!container) return

        // Only if scrolled to top
        if (container.scrollTop > 0) {
            setIsPulling(false)
            setPullDistance(0)
            return
        }

        currentY.current = e.touches[0].clientY
        const distance = Math.max(0, currentY.current - startY.current)

        // Apply resistance for a more natural feel
        const resistedDistance = Math.min(threshold * 1.5, distance * 0.5)
        setPullDistance(resistedDistance)
    }, [isPulling, disabled, isRefreshing, threshold])

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling || disabled) return

        setIsPulling(false)

        if (pullDistance >= threshold) {
            setIsRefreshing(true)
            setPullDistance(threshold)

            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
                setPullDistance(0)
            }
        } else {
            setPullDistance(0)
        }
    }, [isPulling, disabled, pullDistance, threshold, onRefresh])

    const pullProgress = Math.min(1, pullDistance / threshold)

    return {
        containerRef,
        isPulling,
        isRefreshing,
        pullDistance,
        pullProgress,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    }
}
