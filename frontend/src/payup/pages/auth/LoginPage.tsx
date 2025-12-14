import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

import type { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

export function LoginPage() {
  const { state, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = ((loc.state as { from?: { pathname?: string } } | null)?.from?.pathname as string | undefined) ?? '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      nav(from, { replace: true })
    } catch (ex: unknown) {
      const apiErr = ex as ApiError
      setErr(apiErr?.message || (ex instanceof Error ? ex.message : 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#f0f0f0] flex items-center justify-center px-4 font-mono relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#dfff4f]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#ff4f99]/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      </div>

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
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Welcome Back</p>
        </div>

        {state.status === 'loading' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-white/5 border border-white/5 rounded-xl p-3 mb-6 flex items-center gap-3 text-sm text-gray-300"
          >
            <Icon icon="eos-icons:loading" className="w-5 h-5 text-[#dfff4f]" />
            Checking session...
          </motion.div>
        )}
        
        {err && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-[#ff4f99]/10 border border-[#ff4f99]/20 rounded-xl p-3 mb-6 flex items-start gap-3 text-sm text-[#ff4f99]"
          >
            <Icon icon="lucide:alert-circle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {err}
          </motion.div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
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
              <Icon icon="lucide:mail" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-[#dfff4f] transition-colors" />
            </div>
          </div>

          <div className="group">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] uppercase text-gray-500 tracking-widest font-bold group-focus-within:text-[#dfff4f] transition-colors">Password</label>
              <a href="#" className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-[#dfff4f] transition-colors">Forgot?</a>
            </div>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-4 pl-11 text-white placeholder-gray-600 focus:outline-none focus:border-[#dfff4f] focus:ring-1 focus:ring-[#dfff4f] transition-all"
                placeholder="••••••••"
                minLength={8}
                required
              />
              <Icon icon="lucide:lock" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-[#dfff4f] transition-colors" />
            </div>
          </div>

          <button
            disabled={busy}
            className="w-full bg-[#dfff4f] text-black font-bold text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-[#ccee3e] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 group"
          >
            {busy ? (
              <>
                <Icon icon="eos-icons:loading" className="w-5 h-5" />
                Logging in...
              </>
            ) : (
              <>
                Log In
                <Icon icon="lucide:arrow-right" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {/* Social login placeholders (to be implemented later) */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              type="button"
              disabled
              className="w-full bg-white/5 border border-white/10 text-white/60 font-bold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
              title="Coming soon"
            >
              <Icon icon="logos:google-icon" className="w-5 h-5" />
              Continue with Google (soon)
            </button>
            <button
              type="button"
              disabled
              className="w-full bg-white/5 border border-white/10 text-white/60 font-bold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed"
              title="Coming soon"
            >
              <Icon icon="logos:facebook" className="w-5 h-5" />
              Continue with Facebook (soon)
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link className="text-[#dfff4f] font-bold hover:underline" to="/auth/register">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
