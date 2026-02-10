import { memo, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ModalVariant = 'bottom-sheet' | 'center' | 'side'

type Props = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    variant?: ModalVariant
    /** Extra classes on the modal panel */
    className?: string
    /** z-index layer, default z-[60] */
    zIndex?: string
}

// Smooth spring-like easing curve
const EASE = [0.16, 1, 0.3, 1] as const

const panelVariants = {
    'bottom-sheet': {
        initial: { opacity: 0, y: '100%' },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: '100%' },
    },
    center: {
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 20 },
    },
    side: {
        initial: { x: '-100%' },
        animate: { x: 0 },
        exit: { x: '-100%' },
    },
}

/**
 * Reusable animated modal wrapper with backdrop.
 *
 * Three variants:
 * - `bottom-sheet` — slides from the bottom (mobile modals)
 * - `center` — scales from center (dialogs)
 * - `side` — slides from left (side menu)
 *
 * Uses Framer Motion AnimatePresence for smooth enter/exit.
 */
export const ModalWrapper = memo(function ModalWrapper({
    isOpen,
    onClose,
    children,
    variant = 'center',
    className = '',
    zIndex = 'z-[60]',
}: Props) {
    const handleBackdropClick = useCallback(() => {
        onClose()
    }, [onClose])

    const v = panelVariants[variant]

    // Side variant: use different layout (flex row, full height panel)
    const isSide = variant === 'side'

    // Bottom-sheet: full-width on mobile, centered on desktop
    const isBottomSheet = variant === 'bottom-sheet'

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className={`fixed inset-0 ${zIndex} flex ${isBottomSheet
                            ? 'items-end sm:items-center justify-center p-0 sm:p-4'
                            : isSide
                                ? ''
                                : 'items-center justify-center p-4'
                        }`}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={handleBackdropClick}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={v.initial}
                        animate={v.animate}
                        exit={v.exit}
                        transition={{
                            duration: isSide ? 0.3 : 0.25,
                            ease: EASE,
                        }}
                        className={`relative ${isSide ? 'w-[80%] max-w-xs h-full' : ''
                            } ${className}`}
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
})

export default ModalWrapper
