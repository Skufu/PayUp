import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '../api/endpoints'
import { loadTokens, saveTokens, type Tokens } from '../api/client'
import { uiUserFromAuth } from '../ui/users'
import { AuthContext, type AuthContextValue, type AuthState } from './_internal/context'

const ONBOARDING_KEY = 'payup_onboarding_complete'
const FRESH_REGISTRATION_KEY = 'payup_fresh_registration'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, tokens: loadTokens(), rawUser: null })

  useEffect(() => {
    const tok = loadTokens()
    if (!tok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'anon', user: null, tokens: null, rawUser: null })
      return
    }
    const run = async () => {
      try {
        const me = await api.me()
        setState({ status: 'authed', user: uiUserFromAuth(me), tokens: tok, rawUser: me })
      } catch {
        saveTokens(null)
        setState({ status: 'anon', user: null, tokens: null, rawUser: null })
      }
    }
    void run()
  }, [])

  const needsOnboarding = useCallback(() => {
    if (state.status !== 'authed' || !state.rawUser) return false

    // Only show onboarding if:
    // 1. User just registered in this session (fresh registration flag is set)
    // 2. AND they haven't completed onboarding yet
    const isFreshRegistration = sessionStorage.getItem(FRESH_REGISTRATION_KEY) === 'true'
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY) === 'true'

    return isFreshRegistration && !hasCompletedOnboarding
  }, [state])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      needsOnboarding,
      async login(email, password) {
        const res = await api.login(email, password)
        const t: Tokens = { accessToken: res.token.accessToken, refreshToken: res.token.refreshToken }
        saveTokens(t)
        setState({ status: 'authed', user: uiUserFromAuth(res.user), tokens: t, rawUser: res.user })
      },
      async googleLogin(idToken) {
        const res = await api.googleAuth(idToken)
        const t: Tokens = { accessToken: res.token.accessToken, refreshToken: res.token.refreshToken }
        saveTokens(t)
        // Check if this is a new user (no payment QRs and recent creation)
        // For Google login, we consider it a new registration if user has no payment QRs
        const isNewUser = !res.user.paymentQRs || res.user.paymentQRs.length === 0
        if (isNewUser) {
          sessionStorage.setItem(FRESH_REGISTRATION_KEY, 'true')
        }
        setState({ status: 'authed', user: uiUserFromAuth(res.user), tokens: t, rawUser: res.user })
      },
      async register(email, password, name) {
        const res = await api.register(email, password, name)
        const t: Tokens = { accessToken: res.token.accessToken, refreshToken: res.token.refreshToken }
        saveTokens(t)
        // Mark as fresh registration so onboarding will be shown
        sessionStorage.setItem(FRESH_REGISTRATION_KEY, 'true')
        setState({ status: 'authed', user: uiUserFromAuth(res.user), tokens: t, rawUser: res.user })
      },
      async refreshMe() {
        const tok = loadTokens()
        if (!tok) return
        const me = await api.me()
        console.log('[AuthProvider] refreshMe - API response:', me)
        const uiUser = uiUserFromAuth(me)
        console.log('[AuthProvider] refreshMe - UI user:', uiUser)
        setState({ status: 'authed', user: uiUser, tokens: tok, rawUser: me })
      },
      logout() {
        saveTokens(null)
        localStorage.removeItem(ONBOARDING_KEY)
        sessionStorage.removeItem(FRESH_REGISTRATION_KEY)
        setState({ status: 'anon', user: null, tokens: null, rawUser: null })
      },
    }),
    [state, needsOnboarding],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

