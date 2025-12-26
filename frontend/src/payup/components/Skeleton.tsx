import { memo } from 'react'

type SkeletonProps = {
    className?: string
    variant?: 'text' | 'circular' | 'rectangular'
    width?: string | number
    height?: string | number
    animate?: boolean
}

export const Skeleton = memo(function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animate = true,
}: SkeletonProps) {
    const baseClass = 'bg-white/5'
    const animateClass = animate ? 'animate-pulse' : ''

    const variantClass = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    }[variant]

    const style: React.CSSProperties = {
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1em' : '100%'),
    }

    return (
        <div
            className={`${baseClass} ${animateClass} ${variantClass} ${className}`}
            style={style}
        />
    )
})

// Pre-built skeleton compositions for common components
export const BalanceCardSkeleton = memo(function BalanceCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-[#1c1c21] border border-white/5 p-6 md:p-8 z-10">
            <div className="flex flex-col items-center text-center md:items-start md:text-left mb-6">
                <Skeleton variant="text" width={80} height={12} className="mb-2" />
                <Skeleton variant="text" width={60} height={16} className="mb-3" />
                <Skeleton variant="rectangular" width={100} height={28} className="rounded-full" />
            </div>

            <div className="mb-6 text-center md:text-left">
                <Skeleton variant="text" width="60%" height={48} className="mx-auto md:mx-0 mb-2" />
                <Skeleton variant="text" width={180} height={12} className="mx-auto md:mx-0" />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4">
                <div className="text-center md:text-left">
                    <Skeleton variant="text" width={70} height={10} className="mb-1 mx-auto md:mx-0" />
                    <Skeleton variant="text" width={80} height={16} className="mx-auto md:mx-0" />
                </div>
                <div className="text-center md:text-left">
                    <Skeleton variant="text" width={70} height={10} className="mb-1 mx-auto md:mx-0" />
                    <Skeleton variant="text" width={80} height={16} className="mx-auto md:mx-0" />
                </div>
            </div>
        </div>
    )
})

export const SettlementListSkeleton = memo(function SettlementListSkeleton() {
    return (
        <div className="rounded-3xl border border-white/5 bg-[#1c1c21] p-6 relative z-10">
            <Skeleton variant="text" width={120} height={12} className="mb-4" />
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <Skeleton variant="circular" width={40} height={40} />
                        <div className="flex-1">
                            <Skeleton variant="text" width="60%" height={14} className="mb-1" />
                            <Skeleton variant="text" width="40%" height={10} />
                        </div>
                        <Skeleton variant="rectangular" width={60} height={32} className="rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
})

export const ExpenseItemSkeleton = memo(function ExpenseItemSkeleton() {
    return (
        <div className="p-4 rounded-xl bg-[#131316] border border-white/5">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <Skeleton variant="text" width="50%" height={16} className="mb-2" />
                    <Skeleton variant="text" width="70%" height={12} />
                </div>
                <Skeleton variant="rectangular" width={60} height={32} className="rounded-lg" />
            </div>
        </div>
    )
})

export const ExpenseListSkeleton = memo(function ExpenseListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <ExpenseItemSkeleton key={i} />
            ))}
        </div>
    )
})
