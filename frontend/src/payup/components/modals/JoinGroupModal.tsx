import { Check, Loader2, X } from 'lucide-react'
import { useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onJoin: (code: string) => Promise<void>
}

export function JoinGroupModal({ isOpen, onClose, onJoin }: Props) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleJoin = async () => {
    const trimmedCode = code.trim().toUpperCase()
    
    if (!trimmedCode) {
      setError('Please enter an invite code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onJoin(trimmedCode)
      setSuccess(true)
      
      // Close modal after success
      setTimeout(() => {
        onClose()
        setCode('')
        setSuccess(false)
      }, 1500)
    } catch (err: unknown) {
      console.error('Join error:', err)
      const e = err as { status?: number; message?: string }
      
      // Parse error based on status
      const status = e?.status || 0
      if (status === 404) {
        setError('Invalid or expired invite code')
      } else if (status === 403) {
        setError('You do not have permission to join')
      } else if (status === 410) {
        setError('This invite has expired')
      } else if (status === 409) {
        setError('You are already a member of this group')
      } else {
        setError(e?.message || 'Failed to join group')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleJoin()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
          <h3 className="font-display text-xl font-bold text-white">Join Group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-400" />
              </div>
              <p className="text-gray-300 font-bold">Successfully joined!</p>
              <p className="text-gray-500 text-sm mt-2">Loading group...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">
                  Invite Code
                </label>
                <input
                  autoFocus
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g. ABC12345"
                  disabled={isLoading}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg text-center tracking-wider font-bold focus:outline-none focus:border-[#dfff4f] disabled:opacity-50 uppercase"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the 8-character code shared by your group
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                disabled={!code.trim() || isLoading}
                onClick={handleJoin}
                className="w-full bg-[#dfff4f] text-black font-bold font-mono py-4 rounded-xl hover:bg-[#ccee3e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>JOINING...</span>
                  </>
                ) : (
                  <span>JOIN GROUP</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
