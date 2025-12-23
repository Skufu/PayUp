import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Upload, QrCode, Users, Wallet, Bell, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react'

import { api } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'

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
    title: 'Pay with GCash QR',
    description: 'Upload your GCash QR so friends can pay you instantly. Quick and hassle-free.',
  },
  {
    icon: Bell,
    title: 'Get Notified',
    description: 'Receive nudges when someone owes you, and notifications when payments are made.',
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { state: authState, refreshMe } = useAuth()
  const [step, setStep] = useState<'welcome' | 'qr' | 'tutorial'>('welcome')
  const [name, setName] = useState(authState.status === 'authed' ? (authState.user?.name || '') : '')
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tutorialIndex, setTutorialIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return
    setQrFile(file)
    const reader = new FileReader()
    reader.onload = () => setQrPreview(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await api.updateProfile(name.trim(), qrFile ?? undefined)
      await refreshMe()
      // Mark onboarding as complete
      localStorage.setItem('payup_onboarding_complete', 'true')
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSkipToApp = async () => {
    // Save name if entered
    if (name.trim()) {
      setSaving(true)
      try {
        await api.updateProfile(name.trim(), qrFile ?? undefined)
        await refreshMe()
      } catch {
        // Continue even if save fails
      }
      setSaving(false)
    }
    localStorage.setItem('payup_onboarding_complete', 'true')
    navigate('/app', { replace: true })
  }

  const handleNextTutorial = () => {
    if (tutorialIndex < TUTORIAL_SLIDES.length - 1) {
      setTutorialIndex(tutorialIndex + 1)
    } else {
      handleSaveProfile()
    }
  }

  const handlePrevTutorial = () => {
    if (tutorialIndex > 0) {
      setTutorialIndex(tutorialIndex - 1)
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <div className="text-xl font-bold font-mono tracking-tight">
          <span className="text-[#dfff4f]">Pay</span>Up
        </div>
        <button
          onClick={handleSkipToApp}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          Skip <X size={14} />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="px-6 py-2">
        <div className="flex gap-2">
          <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'welcome' ? 'bg-[#dfff4f]' : 'bg-white/20'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'qr' ? 'bg-[#dfff4f]' : 'bg-white/20'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'tutorial' ? 'bg-[#dfff4f]' : 'bg-white/20'}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Step 1: Welcome & Name */}
        {step === 'welcome' && (
          <div className="w-full max-w-sm animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#dfff4f] rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} className="text-black" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to PayUp!</h1>
              <p className="text-gray-400">Let's set up your profile so your friends can recognize you.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase text-gray-500 font-mono tracking-widest mb-2 block">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-4 bg-[#131316] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#dfff4f] transition-colors text-lg"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
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
                  setStep('qr')
                }}
                className="w-full py-4 bg-[#dfff4f] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4f53f] transition-colors"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: GCash QR */}
        {step === 'qr' && (
          <div className="w-full max-w-sm animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#0070E0] rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode size={40} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Add Your GCash QR</h1>
              <p className="text-gray-400">Upload your GCash QR code so friends can pay you easily. You can add this later.</p>
            </div>

            <div className="space-y-4">
              <div
                className="w-48 h-48 mx-auto bg-white p-4 rounded-xl cursor-pointer relative group overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {qrPreview ? (
                  <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Upload size={32} className="mb-2" />
                    <span className="text-sm font-mono">Tap to upload</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <Upload size={24} className="text-white mb-2" />
                  <span className="text-xs font-bold text-white uppercase">{qrPreview ? 'Change' : 'Upload'}</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrChange}
              />

              <p className="text-xs text-gray-500 text-center">JPG, PNG or WEBP. Max 5MB.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 py-4 bg-[#131316] border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#1c1c21] transition-colors"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={() => setStep('tutorial')}
                  className="flex-1 py-4 bg-[#dfff4f] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4f53f] transition-colors"
                >
                  {qrPreview ? 'Continue' : 'Skip'} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tutorial */}
        {step === 'tutorial' && (
          <div className="w-full max-w-sm animate-fade-in">
            <div className="text-center mb-8">
              {(() => {
                const slide = TUTORIAL_SLIDES[tutorialIndex]
                const Icon = slide.icon
                return (
                  <>
                    <div className="w-20 h-20 bg-[#1c1c21] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon size={40} className="text-[#dfff4f]" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">{slide.title}</h1>
                    <p className="text-gray-400">{slide.description}</p>
                  </>
                )
              })()}
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mb-8">
              {TUTORIAL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTutorialIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === tutorialIndex ? 'bg-[#dfff4f]' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={tutorialIndex === 0 ? () => setStep('qr') : handlePrevTutorial}
                className="flex-1 py-4 bg-[#131316] border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#1c1c21] transition-colors"
              >
                <ChevronLeft size={20} /> Back
              </button>
              <button
                onClick={handleNextTutorial}
                disabled={saving}
                className="flex-1 py-4 bg-[#dfff4f] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4f53f] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : tutorialIndex === TUTORIAL_SLIDES.length - 1 ? 'Get Started' : 'Next'}{' '}
                {!saving && <ChevronRight size={20} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
