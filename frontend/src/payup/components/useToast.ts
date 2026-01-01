import { useContext } from 'react'
import { ToastContext, ToastContextValue } from './ToastContext'

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}
