import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Download, Loader2, Lock, Mail, User, X } from 'lucide-react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'

import type { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { NetworkBackground } from '../../components/NetworkBackground'
import { useShouldShowPWAGuide } from '../../pwa/pwaGuide'

export function RegisterPage() {
  const { register, googleLogin } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const shouldShowPWAGuide = useShouldShowPWAGuide()
  const [pwaBannerDismissed, setPWABannerDismissed] = useState(false)

  const handleGoogleSuccess = useCallback(async (response: CredentialResponse) => {
    if (!response.credential) {
      setErr('Google login failed - no credential')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      await googleLogin(response.credential)
      nav('/app', { replace: true })
    } catch (ex: unknown) {
      const apiErr = ex as ApiError
      setErr(apiErr?.message || (ex instanceof Error ? ex.message : 'Google login failed'))
    } finally {
      setBusy(false)
    }
  }, [googleLogin, nav])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await register(email.trim(), password, name.trim())
      nav('/app', { replace: true })
    } catch (ex: unknown) {
      const apiErr = ex as ApiError
      setErr(apiErr?.message || (ex instanceof Error ? ex.message : 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#f0f0f0] flex items-center justify-center px-4 font-mono relative overflow-hidden">

      {/* Animated Network Background */}
      <NetworkBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#131316]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10"
      >
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block font-display text-4xl font-bold text-[#dfff4f] mb-2 hover:opacity-80 transition-opacity">
            PayUp.
          </Link>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Join the Network</p>
        </div>

        {shouldShowPWAGuide && !pwaBannerDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-[#dfff4f]/5 border border-[#dfff4f]/20 rounded-xl p-3 mb-6 relative"
          >
            <button
              type="button"
              onClick={() => setPWABannerDismissed(true)}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-3 pr-6">
              <div className="w-8 h-8 rounded-lg bg-[#dfff4f]/10 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-[#dfff4f]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white font-medium">Install PayUp for the best experience</p>
                <p className="text-[10px] text-gray-500">Add to home screen for quick access & notifications</p>
              </div>
            </div>
          </motion.div>
        )}

        {err && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-[#ff4f99]/10 border border-[#ff4f99]/20 rounded-xl p-3 mb-6 flex items-start gap-3 text-sm text-[#ff4f99]"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {err}
          </motion.div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="group">
            <label className="block text-[10px] uppercase text-gray-500 tracking-widest font-bold mb-2 group-focus-within:text-[#dfff4f] transition-colors">Full Name</label>
            <div className="relative">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-4 pl-11 text-white placeholder-gray-600 focus:outline-none focus:border-[#dfff4f] focus:ring-1 focus:ring-[#dfff4f] transition-all"
                placeholder="How should we call you?"
                required
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-[#dfff4f] transition-colors" />
            </div>
          </div>

          <div className="group">
            <label className="block text-[10px] uppercase text-gray-500 tracking-widest font-bold mb-2 group-focus-within:text-[#dfff4f] transition-colors">Email Address</label>
            <div className="relative">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-4 pl-11 text-white placeholder-gray-600 focus:outline-none focus:border-[#dfff4f] focus:ring-1 focus:ring-[#dfff4f] transition-all"
                placeholder="you@example.com"
                required
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-[#dfff4f] transition-colors" />
            </div>
          </div>

          <div className="group">
            <label className="block text-[10px] uppercase text-gray-500 tracking-widest font-bold mb-2 group-focus-within:text-[#dfff4f] transition-colors">Password</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-4 pl-11 text-white placeholder-gray-600 focus:outline-none focus:border-[#dfff4f] focus:ring-1 focus:ring-[#dfff4f] transition-all"
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-[#dfff4f] transition-colors" />
            </div>
          </div>

          <button
            disabled={busy}
            className="w-full bg-[#dfff4f] text-black font-bold text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-[#ccee3e] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 group"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Start for Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {/* Social login */}
          <div className="relative pt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#131316] px-4 text-gray-500 uppercase tracking-widest">Or sign up with</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErr('Google sign-in failed')}
              theme="filled_black"
              shape="pill"
              size="large"
              text="signup_with"
              width="300"
            />
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link className="text-[#dfff4f] font-bold hover:underline" to="/auth/login">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
