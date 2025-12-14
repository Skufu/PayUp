import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { api } from '../api/endpoints'
import { loadTokens, saveTokens, type Tokens } from '../api/client'
import { uiUserFromAuth } from '../ui/users'
import { AuthContext, type AuthContextValue, type AuthState } from './_internal/context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, tokens: loadTokens() })

  useEffect(() => {
    const tok = loadTokens()
    if (!tok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'anon', user: null, tokens: null })
      return
    }
    const run = async () => {
      try {
        const me = await api.me()
        setState({ status: 'authed', user: uiUserFromAuth(me), tokens: tok })
      } catch {
        saveTokens(null)
        setState({ status: 'anon', user: null, tokens: null })
      }
    }
    void run()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      async login(email, password) {
        const res = await api.login(email, password)
        const t: Tokens = { accessToken: res.token.accessToken, refreshToken: res.token.refreshToken }
        saveTokens(t)
        setState({ status: 'authed', user: uiUserFromAuth(res.user), tokens: t })
      },
      async googleLogin(idToken) {
        const res = await api.googleAuth(idToken)
        const t: Tokens = { accessToken: res.token.accessToken, refreshToken: res.token.refreshToken }
        saveTokens(t)
        setState({ status: 'authed', user: uiUserFromAuth(res.user), tokens: t })
      },
      async register(email, password, name) {
        const res = await api.register(email, password, name)
        const t: Tokens = { accessToken: res.token.accessToken, refreshToken: res.token.refreshToken }
        saveTokens(t)
        setState({ status: 'authed', user: uiUserFromAuth(res.user), tokens: t })
      },
      async refreshMe() {
        const tok = loadTokens()
        if (!tok) return
        const me = await api.me()
        console.log('[AuthProvider] refreshMe - API response:', me)
        const uiUser = uiUserFromAuth(me)
        console.log('[AuthProvider] refreshMe - UI user:', uiUser)
        setState({ status: 'authed', user: uiUser, tokens: tok })
      },
      logout() {
        saveTokens(null)
        setState({ status: 'anon', user: null, tokens: null })
      },
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

