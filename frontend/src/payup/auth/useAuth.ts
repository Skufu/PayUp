import { useContext } from 'react'

import { AuthContext } from './_internal/context'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}

