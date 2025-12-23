import { createContext } from 'react'

import type { Tokens } from '../../api/client'
import type { User } from '../../types'
import type { AuthUser } from '../../api/endpoints'

export type AuthState =
  | { status: 'loading'; user: null; tokens: Tokens | null; rawUser: null }
  | { status: 'anon'; user: null; tokens: null; rawUser: null }
  | { status: 'authed'; user: User; tokens: Tokens; rawUser: AuthUser }

export type AuthContextValue = {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  refreshMe: () => Promise<void>
  logout: () => void
  needsOnboarding: () => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

