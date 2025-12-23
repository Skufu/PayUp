import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

type Props = {
  children: ReactNode
  skipOnboarding?: boolean
}

export function RequireAuth({ children, skipOnboarding = false }: Props) {
  const { state, needsOnboarding } = useAuth()
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

  // Redirect to onboarding if needed (unless we're already on onboarding page)
  if (!skipOnboarding && needsOnboarding() && loc.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
  }

  return <>{children}</>
}

