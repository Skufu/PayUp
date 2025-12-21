import { memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

type Props = {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = memo(function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const handleConfirm = useCallback(() => {
    onConfirm()
  }, [onConfirm])

  const handleCancel = useCallback(() => {
    onCancel()
  }, [onCancel])

  const variantStyles = {
    danger: {
      icon: 'bg-red-500/10 text-red-500',
      button: 'bg-red-500 hover:bg-red-600 text-white',
    },
    warning: {
      icon: 'bg-orange-500/10 text-orange-500',
      button: 'bg-orange-500 hover:bg-orange-600 text-black',
    },
    default: {
      icon: 'bg-[#dfff4f]/10 text-[#dfff4f]',
      button: 'bg-[#dfff4f] hover:bg-[#ccee3e] text-black',
    },
  }

  const styles = variantStyles[variant]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm bg-[#131316] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                  <p className="text-sm text-gray-400">{message}</p>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-1 text-gray-500 hover:text-white transition-colors flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-bold text-sm hover:bg-white/5 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${styles.button}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

export default ConfirmDialog
