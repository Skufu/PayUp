import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Mail, MailCheck } from 'lucide-react'

import type { ApiError } from '../../api/client'
import { api } from '../../api/endpoints'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.requestPasswordReset(email.trim())
      setSuccess(true)
    } catch (ex: unknown) {
      const apiErr = ex as ApiError
      setErr(apiErr?.message || (ex instanceof Error ? ex.message : 'Request failed'))
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f0f0f0] flex items-center justify-center px-4 font-mono relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#dfff4f]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#ff4f99]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-[#131316]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 text-center"
        >
          <div className="w-16 h-16 bg-[#dfff4f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MailCheck className="w-8 h-8 text-[#dfff4f]" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
          <p className="text-gray-400 mb-6">
            If an account exists for <span className="text-white">{email}</span>, we've sent password reset instructions.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 text-[#dfff4f] font-bold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#f0f0f0] flex items-center justify-center px-4 font-mono relative overflow-hidden">
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
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Reset Password</p>
        </div>

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

        <p className="text-gray-400 text-sm mb-6">
          Enter your email address and we'll send you instructions to reset your password.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="group">
            <label className="block text-[10px] uppercase text-gray-500 tracking-widest font-bold mb-2 group-focus-within:text-[#dfff4f] transition-colors">
              Email Address
            </label>
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

          <button
            disabled={busy}
            className="w-full bg-[#dfff4f] text-black font-bold text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-[#ccee3e] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 group"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <Link className="text-[#dfff4f] font-bold hover:underline inline-flex items-center gap-2" to="/auth/login">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
