import { memo } from 'react'
import { RefreshCw } from 'lucide-react'

type PullToRefreshIndicatorProps = {
    pullProgress: number
    isRefreshing: boolean
    pullDistance: number
}

export const PullToRefreshIndicator = memo(function PullToRefreshIndicator({
    pullProgress,
    isRefreshing,
    pullDistance,
}: PullToRefreshIndicatorProps) {
    if (pullDistance <= 0 && !isRefreshing) return null

    return (
        <div
            className="flex justify-center items-center transition-all duration-200 overflow-hidden"
            style={{ height: pullDistance }}
        >
            <div
                className={`w-8 h-8 rounded-full bg-[#1c1c21] border border-white/10 flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''
                    }`}
                style={{
                    transform: `rotate(${pullProgress * 360}deg)`,
                    opacity: Math.min(1, pullProgress * 1.5),
                }}
            >
                <RefreshCw
                    size={16}
                    className={pullProgress >= 1 || isRefreshing ? 'text-[#dfff4f]' : 'text-gray-500'}
                />
            </div>
        </div>
    )
})
