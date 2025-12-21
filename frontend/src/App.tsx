import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from './payup/auth/RequireAuth'
import { PayUpApp } from './payup/PayUpApp'
import { LoginPage } from './payup/pages/auth/LoginPage'
import { RegisterPage } from './payup/pages/auth/RegisterPage'
import { ForgotPasswordPage } from './payup/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './payup/pages/auth/ResetPasswordPage'
import { LandingPage } from './payup/pages/LandingPage'
import { JoinGroupPage } from './payup/pages/JoinGroupPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join/:code" element={<JoinGroupPage />} />
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
    </BrowserRouter>
  )
}
