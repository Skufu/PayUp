import { Check, ChevronDown, Copy, Share2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
  onGenerateInvite: (
    groupId: string,
    options?: { expiresInHours?: number; maxUses?: number },
  ) => Promise<{ code: string; expiresAt?: string; maxUses?: number }>
}

const EXPIRATION_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: 'Never', value: 0 },
]

export function ShareInviteModal({ isOpen, onClose, groupId, groupName, onGenerateInvite }: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Options state
  const [expirationHours, setExpirationHours] = useState(168) // 7 days default
  const [singleUse, setSingleUse] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const generateCode = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const options: { expiresInHours?: number; maxUses?: number } = {}
      if (expirationHours > 0) {
        options.expiresInHours = expirationHours
      } else {
        options.expiresInHours = 0 // Never expires
      }
      if (singleUse) {
        options.maxUses = 1
      }
      const result = await onGenerateInvite(groupId, options)
      setInviteCode(result.code)
      setExpiresAt(result.expiresAt || null)
    } catch (err) {
      setError('Failed to generate invite code')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, onGenerateInvite, expirationHours, singleUse])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInviteCode(null)
      setExpiresAt(null)
      setShowOptions(false)
      setError(null)
    }
  }, [isOpen])

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

  const formatExpiry = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
          {/* Options Section - show before generating */}
          {!inviteCode && !isLoading && (
            <>
              <div className="space-y-4">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showOptions ? 'rotate-180' : ''}`}
                  />
                  <span>Invite Options</span>
                </button>

                {showOptions && (
                  <div className="space-y-4 animate-slide-up">
                    {/* Expiration Dropdown */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">
                        Expires After
                      </label>
                      <select
                        value={expirationHours}
                        onChange={(e) => setExpirationHours(Number(e.target.value))}
                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm appearance-none cursor-pointer focus:outline-none focus:border-[#dfff4f]/50"
                      >
                        {EXPIRATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Single Use Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] uppercase text-gray-500 font-mono block tracking-wider">
                          Single Use
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          Invite can only be used once
                        </p>
                      </div>
                      <button
                        onClick={() => setSingleUse(!singleUse)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${singleUse ? 'bg-[#dfff4f]' : 'bg-white/10'
                          }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full transition-all ${singleUse ? 'left-7 bg-black' : 'left-1 bg-gray-400'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generateCode}
                className="w-full bg-[#dfff4f] text-black font-bold font-mono py-4 rounded-xl hover:bg-[#ccee3e] transition-colors"
              >
                Generate Invite Link
              </button>
            </>
          )}

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
                onClick={() => {
                  setError(null)
                  setInviteCode(null)
                }}
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

              {/* Invite Info */}
              <div className="text-xs text-gray-500 text-center space-y-1">
                {expiresAt && (
                  <p>Expires: {formatExpiry(expiresAt)}</p>
                )}
                {singleUse && (
                  <p className="text-amber-500">This is a single-use invite</p>
                )}
                {!expiresAt && !singleUse && (
                  <p>Anyone with this link can join {groupName}</p>
                )}
              </div>

              {/* Generate New Button */}
              <button
                onClick={() => {
                  setInviteCode(null)
                  setExpiresAt(null)
                }}
                className="w-full text-sm text-gray-500 hover:text-white transition-colors"
              >
                Generate a different invite
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
