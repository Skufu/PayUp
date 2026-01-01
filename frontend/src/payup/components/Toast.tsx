import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import { ToastContext } from './ToastContext'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
}

const TOAST_DURATION = 3000

const icons: Record<ToastType, typeof Check> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
}

const colors: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-[#1c1c21]',
    icon: 'bg-[#dfff4f] text-black',
    border: 'border-[#dfff4f]/30',
  },
  error: {
    bg: 'bg-[#1c1c21]',
    icon: 'bg-red-500 text-white',
    border: 'border-red-500/30',
  },
  warning: {
    bg: 'bg-[#1c1c21]',
    icon: 'bg-orange-500 text-white',
    border: 'border-orange-500/30',
  },
  info: {
    bg: 'bg-[#1c1c21]',
    icon: 'bg-blue-500 text-white',
    border: 'border-blue-500/30',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = icons[toast.type]
  const color = colors[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`${color.bg} ${color.border} border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 min-w-[200px] max-w-[320px]`}
    >
      <div className={`${color.icon} w-6 h-6 rounded-full flex items-center justify-center shrink-0`}>
        <Icon size={14} strokeWidth={3} />
      </div>
      <span className="text-white text-sm font-medium">{toast.message}</span>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
