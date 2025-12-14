import { createContext } from 'react'

import type { Tokens } from '../../api/client'
import type { User } from '../../types'

export type AuthState =
  | { status: 'loading'; user: null; tokens: Tokens | null }
  | { status: 'anon'; user: null; tokens: null }
  | { status: 'authed'; user: User; tokens: Tokens }

export type AuthContextValue = {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  refreshMe: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

