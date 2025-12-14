import { Check, Copy, Share2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
  onGenerateInvite: (groupId: string) => Promise<{ code: string; expiresAt?: string }>
}

export function ShareInviteModal({ isOpen, onClose, groupId, groupName, onGenerateInvite }: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateCode = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await onGenerateInvite(groupId)
      setInviteCode(result.code)
    } catch (err) {
      setError('Failed to generate invite code')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, onGenerateInvite])

  useEffect(() => {
    if (isOpen && !inviteCode) {
      void generateCode()
    }
  }, [generateCode, inviteCode, isOpen])

  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : ''

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    if (!inviteLink) return
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on PayUp`,
          text: `You've been invited to join ${groupName}! Click the link to join:`,
          url: inviteLink,
        })
      } catch (err) {
        // User cancelled or share failed
        console.error('Share failed:', err)
      }
    } else {
      // Fallback to copy
      handleCopy()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
          <h3 className="font-display text-xl font-bold text-white">Invite to {groupName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-[#dfff4f] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm mt-4">Generating invite code...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={generateCode}
                className="mt-2 text-xs text-red-300 underline hover:text-red-200"
              >
                Try again
              </button>
            </div>
          )}

          {inviteCode && !isLoading && (
            <>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">
                  Invite Link
                </label>
                <div className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 break-all">
                  {inviteLink}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">
                  Invite Code
                </label>
                <div className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-center">
                  <span className="font-mono text-2xl font-bold text-[#dfff4f] tracking-wider">
                    {inviteCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold font-mono py-3 rounded-xl transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={18} className="text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 bg-[#dfff4f] text-black font-bold font-mono py-3 rounded-xl hover:bg-[#ccee3e] transition-colors"
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Anyone with this link can join {groupName}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
