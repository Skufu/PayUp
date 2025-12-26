import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from './payup/auth/RequireAuth'

// Lazy load all page components for route-level code splitting
const PayUpApp = lazy(() => import('./payup/PayUpApp').then(m => ({ default: m.PayUpApp })))
const LoginPage = lazy(() => import('./payup/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./payup/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./payup/pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./payup/pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const LandingPage = lazy(() => import('./payup/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const JoinGroupPage = lazy(() => import('./payup/pages/JoinGroupPage').then(m => ({ default: m.JoinGroupPage })))
const OnboardingPage = lazy(() => import('./payup/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))

// Minimal loading fallback for route transitions
const RouteLoadingFallback = () => (
  <div className="h-screen w-screen bg-[#050507] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[#dfff4f] border-t-transparent rounded-full animate-spin" />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/join/:code" element={<JoinGroupPage />} />
          <Route
            path="/app/onboarding"
            element={
              <RequireAuth skipOnboarding>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <PayUpApp />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
