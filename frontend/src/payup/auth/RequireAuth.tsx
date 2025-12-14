import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const loc = useLocation()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center font-mono">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  if (state.status !== 'authed') {
    return <Navigate to="/auth/login" replace state={{ from: loc }} />
  }

  return <>{children}</>
}

