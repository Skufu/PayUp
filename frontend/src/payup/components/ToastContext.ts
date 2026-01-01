import { createContext } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastContextValue = {
    showToast: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
