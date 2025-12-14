import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Loader2, X } from 'lucide-react'

import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'

export function JoinGroupPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { state: authState } = useAuth()
  const missingCode = !code
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => (missingCode ? 'error' : 'loading'))
  const [errorMessage, setErrorMessage] = useState<string>(() => (missingCode ? 'Missing invite code' : ''))

  useEffect(() => {
    if (!code) return

    // If not authenticated, redirect to login with return path
    if (authState.status !== 'authed') {
      navigate(`/auth/login?redirect=/join/${code}`)
      return
    }

    // Attempt to join the group
    const joinGroup = async () => {
      try {
        const result = await api.joinByCode(code)
        console.log('Successfully joined group:', result.groupId)
        setStatus('success')
        // Redirect to app after a brief success message
        setTimeout(() => {
          navigate('/app')
        }, 1500)
      } catch (err: unknown) {
        console.error('Failed to join group:', err)
        const e = err as { status?: number; message?: string }
        setStatus('error')
        
        // Parse error message based on status code
        const status = e?.status || 0
        const msg = e?.message || ''
        if (status === 404 || msg.includes('404') || msg.toLowerCase().includes('invalid')) {
          setErrorMessage('Invalid or expired invite code')
        } else if (status === 403 || msg.includes('403')) {
          setErrorMessage('You do not have permission to join this group')
        } else if (status === 410 || msg.includes('410')) {
          setErrorMessage('This invite has expired')
        } else if (status === 401 || msg.includes('401')) {
          setErrorMessage('Please log in first')
        } else {
          setErrorMessage(e?.message || 'Failed to join group. Please try again.')
        }
      }
    }

    joinGroup()
  }, [code, authState.status, navigate])

  if (missingCode) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#050507] font-mono flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <X size={32} className="text-red-400" />
              </div>
              <div>
                <p className="text-red-400 font-bold mb-2">Invalid invite link</p>
                <p className="text-gray-400 text-sm">{errorMessage || 'Missing invite code.'}</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold font-mono py-3 rounded-xl transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#050507] font-mono flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] to-[#050507]" />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[#dfff4f] rounded-full mix-blend-overlay filter blur-[120px] opacity-5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-8 text-center space-y-6">
            {/* Logo/Title */}
            <div>
              <h1 className="font-display text-3xl font-bold text-[#dfff4f] mb-2">PayUp</h1>
              <p className="text-gray-400 text-sm">Join Group</p>
            </div>

            {/* Status */}
            {status === 'loading' && (
              <div className="py-8">
                <Loader2 size={48} className="text-[#dfff4f] animate-spin mx-auto mb-4" />
                <p className="text-gray-300 font-bold">Joining group...</p>
                <p className="text-gray-500 text-sm mt-2">Please wait</p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-400" />
                </div>
                <p className="text-gray-300 font-bold">Successfully joined!</p>
                <p className="text-gray-500 text-sm mt-2">Redirecting to your group...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="py-8">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} className="text-red-400" />
                </div>
                <p className="text-red-400 font-bold mb-2">Failed to join group</p>
                <p className="text-gray-400 text-sm">{errorMessage}</p>
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => navigate('/app')}
                    className="w-full bg-[#dfff4f] text-black font-bold font-mono py-3 rounded-xl hover:bg-[#ccee3e] transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold font-mono py-3 rounded-xl transition-colors"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            )}

            {/* Code Display */}
            {code && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] uppercase text-gray-500 font-mono mb-2 tracking-wider">
                  Invite Code
                </p>
                <p className="font-mono text-lg text-gray-300 tracking-wider">{code}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
