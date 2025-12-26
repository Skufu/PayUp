import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, QrCode, Users, Wallet, Bell, ChevronLeft, X, Camera, Check } from 'lucide-react'

import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { PAYMENT_PROVIDERS } from '../constants/PaymentProviders'

const TUTORIAL_SLIDES = [
  {
    icon: Users,
    title: 'Create or Join Groups',
    description: 'Start a trip group or join one using an invite code. Split expenses easily with friends.',
  },
  {
    icon: Wallet,
    title: 'Track Expenses',
    description: 'Add expenses and let PayUp calculate who owes who. No more awkward money talks.',
  },
  {
    icon: QrCode,
    title: 'Pay with GCash & Maya',
    description: 'Upload your payment QRs so friends can pay you instantly. Quick and hassle-free.',
  },
  {
    icon: Bell,
    title: 'Get Notified',
    description: 'Receive nudges when someone owes you, and notifications when payments are made.',
  },
]

type QRState = {
  provider: string
  file: File | null
  preview: string
  phoneNumber: string
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { state: authState, refreshMe } = useAuth()

  const [step, setStep] = useState<'welcome' | 'payment' | 'tutorial'>('welcome')
  const [name, setName] = useState(authState.status === 'authed' ? (authState.user?.name || '') : '')

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  // Payment QRs
  const [paymentQRs, setPaymentQRs] = useState<Record<string, QRState>>({
    gcash: { provider: 'gcash', file: null, preview: '', phoneNumber: '' },
    maya: { provider: 'maya', file: null, preview: '', phoneNumber: '' }
  })

  const [activeProvider, setActiveProvider] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tutorialIndex, setTutorialIndex] = useState(0)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProvider) return
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = () => {
      setPaymentQRs(prev => ({
        ...prev,
        [activeProvider]: {
          ...prev[activeProvider],
          provider: activeProvider,
          file,
          preview: String(reader.result ?? '')
        }
      }))
      setActiveProvider(null)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      setStep('welcome')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Update basic profile
      await api.updateProfile(name.trim(), undefined, avatarFile ?? undefined)

      // 2. Upload payment QRs
      for (const key in paymentQRs) {
        const qr = paymentQRs[key]
        if (qr.file || qr.phoneNumber) {
          await api.addPaymentQR(qr.provider, qr.file || undefined, qr.phoneNumber || undefined)
        }
      }

      await refreshMe()

      // Mark onboarding as complete and clear fresh registration flag
      localStorage.setItem('payup_onboarding_complete', 'true')
      sessionStorage.removeItem('payup_fresh_registration')
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSkipToApp = () => {
    localStorage.setItem('payup_onboarding_complete', 'true')
    sessionStorage.removeItem('payup_fresh_registration')
    navigate('/app', { replace: true })
  }

  const handleNextTutorial = () => {
    if (tutorialIndex < TUTORIAL_SLIDES.length - 1) {
      setTutorialIndex(tutorialIndex + 1)
    } else {
      handleSaveProfile()
    }
  }

  const hasAnyPaymentInfo = useMemo(() => Object.values(paymentQRs).some(qr => !!qr.preview || !!qr.phoneNumber.trim()), [paymentQRs])

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col font-sans">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#050507]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="text-xl font-bold font-mono tracking-tight">
          <span className="text-[#dfff4f]">Pay</span>Up
        </div>
        <button
          onClick={handleSkipToApp}
          className="text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1"
        >
          Skip Onboarding <X size={14} />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="px-6 py-2">
        <div className="flex gap-2 max-w-sm mx-auto">
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === 'welcome' ? 'bg-[#dfff4f] w-full' : 'bg-[#dfff4f]/40'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === 'payment' ? 'bg-[#dfff4f] w-full' : (step === 'tutorial' ? 'bg-[#dfff4f]/40' : 'bg-white/10')}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === 'tutorial' ? 'bg-[#dfff4f]' : 'bg-white/10'}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 max-w-sm mx-auto w-full">
        {/* Step 1: Profile (Name & Avatar) */}
        {step === 'welcome' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10">
              <div className="relative inline-block mb-6">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-24 h-24 bg-[#1c1c21] rounded-full flex items-center justify-center border-2 border-white/10 overflow-hidden cursor-pointer hover:border-[#dfff4f]/50 transition-colors group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-500 group-hover:text-gray-300">
                      <Users size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#dfff4f] rounded-full flex items-center justify-center text-black border-4 border-[#050507] hover:scale-110 transition-transform"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Getting Ready</h1>
              <p className="text-gray-400 text-sm">Let's set up your profile so your friends can recognize you.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-gray-500 font-mono tracking-[0.2em] ml-1">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-5 py-4 bg-[#131316] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-[#dfff4f] focus:ring-1 focus:ring-[#dfff4f] transition-all text-lg font-medium"
                  autoFocus
                />
              </div>

              {error && step === 'welcome' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">!</div>
                  {error}
                </div>
              )}

              <button
                onClick={() => {
                  if (!name.trim()) {
                    setError('Please enter your name')
                    return
                  }
                  setError(null)
                  setStep('payment')
                }}
                className="w-full py-4 bg-[#dfff4f] text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-[#d4f53f] transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(223,255,79,0.2)]"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Payments */}
        {step === 'payment' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-[#dfff4f]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#dfff4f]/20">
                <QrCode size={32} className="text-[#dfff4f]" />
              </div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Payment Methods</h1>
              <p className="text-gray-400 text-sm px-4">Upload your QR codes so friends can pay you easily via GCash or Maya.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {PAYMENT_PROVIDERS.map((provider) => {
                  const hasQR = !!paymentQRs[provider.id]?.preview
                  const phoneValue = paymentQRs[provider.id]?.phoneNumber || ''
                  return (
                    <div
                      key={provider.id}
                      className={`relative p-4 rounded-2xl border transition-all ${hasQR
                        ? 'bg-[#131316] border-[#dfff4f]/30 ring-1 ring-[#dfff4f]/20'
                        : 'bg-[#131316] border-white/5'
                        }`}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveProvider(provider.id)
                          qrInputRef.current?.click()
                        }}
                        className="flex items-center gap-4 cursor-pointer group"
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner"
                          style={{ backgroundColor: provider.lightColor }}
                        >
                          {provider.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-lg">{provider.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{hasQR ? 'QR Uploaded' : 'Tap to upload QR'}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${hasQR ? 'bg-[#dfff4f] text-black scale-100' : 'bg-white/5 text-transparent scale-75 group-hover:bg-white/10'
                          }`}>
                          <Check size={14} className={hasQR ? 'opacity-100' : 'opacity-0'} />
                        </div>

                        {hasQR && (
                          <div className="absolute -top-2 -right-2 w-14 h-14 bg-white p-1 rounded-lg border-2 border-[#131316] shadow-xl rotate-3">
                            <img src={paymentQRs[provider.id].preview} alt="QR" className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                        )}
                      </div>

                      {/* Phone Number Input */}
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <label className="text-[9px] uppercase text-gray-500 font-mono tracking-wider mb-1.5 block">
                          Mobile Number (Optional)
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 09171234567"
                          value={phoneValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setPaymentQRs(prev => ({
                              ...prev,
                              [provider.id]: {
                                ...prev[provider.id],
                                phoneNumber: e.target.value
                              }
                            }))
                          }}
                          className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#dfff4f]/50 font-mono"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrChange}
              />

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep('welcome')}
                  className="w-20 py-4 bg-[#131316] border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center hover:bg-[#1c1c21] transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => setStep('tutorial')}
                  className="flex-1 py-4 bg-[#dfff4f] text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#d4f53f] transition-all shadow-[0_0_20px_rgba(223,255,79,0.1)]"
                >
                  {hasAnyPaymentInfo ? 'Continue' : 'Skip for now'} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tutorial */}
        {step === 'tutorial' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10 min-h-[220px]">
              {(() => {
                const slide = TUTORIAL_SLIDES[tutorialIndex]
                const Icon = slide.icon
                return (
                  <div key={tutorialIndex} className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-[#1c1c21] border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-2xl">
                      <Icon size={44} className="text-[#dfff4f]" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3 tracking-tight">{slide.title}</h1>
                    <p className="text-gray-400 text-sm leading-relaxed px-2">{slide.description}</p>
                  </div>
                )
              })()}
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mb-10">
              {TUTORIAL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTutorialIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === tutorialIndex ? 'bg-[#dfff4f] w-8' : 'bg-white/10 w-2'
                    }`}
                />
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={tutorialIndex === 0 ? () => setStep('payment') : () => setTutorialIndex(p => p - 1)}
                className="w-20 py-4 bg-[#131316] border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center hover:bg-[#1c1c21] transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={handleNextTutorial}
                disabled={saving}
                className="flex-1 py-4 bg-[#dfff4f] text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#d4f53f] transition-all disabled:opacity-50 shadow-[0_0_25px_rgba(223,255,79,0.2)]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : tutorialIndex === TUTORIAL_SLIDES.length - 1 ? (
                  'Let\'s Go!'
                ) : (
                  'Next'
                )}
                {!saving && <ArrowRight size={20} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {step !== 'tutorial' && (
        <div className="p-6 text-center animate-in fade-in slide-in-from-bottom-2 delay-700 duration-1000">
          <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">
            {step === 'welcome' ? 'Step 1 of 3: Profile' : 'Step 2 of 3: Payments'}
          </p>
        </div>
      )}
    </div>
  )
}
