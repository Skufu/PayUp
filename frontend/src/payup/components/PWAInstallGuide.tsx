import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Share, Smartphone, Plus, ArrowRight, Check, Zap, WifiOff, Bell, Maximize, Loader2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

type Props = {
  onContinue: () => void
}

export const PWAInstallGuide = memo(function PWAInstallGuide({ onContinue }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS] = useState<boolean>(() => isIOSDevice())
  const [isInstalled, setIsInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setDeferredPrompt(null)
        // Auto continue after install
        setTimeout(onContinue, 1500)
      }
    } finally {
      setInstalling(false)
    }
  }, [deferredPrompt, onContinue])

  return (
    <div className="min-h-screen bg-[#050507] text-[#f0f0f0] flex flex-col px-4 py-8 font-mono relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#dfff4f]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#ff4f99]/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col flex-1"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#dfff4f] to-[#ccee3e] mb-6 shadow-[0_0_40px_rgba(223,255,79,0.3)]">
            <Smartphone size={36} className="text-black" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">Install PayUp</h1>
          <p className="text-sm text-gray-400">For the best experience, add PayUp to your home screen</p>
        </div>

        {/* Benefits */}
        <div className="bg-[#131316]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6">
          <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">Why Install?</h2>
          <div className="space-y-4">
            {[
              { Icon: Zap, text: 'Instant access from home screen' },
              { Icon: WifiOff, text: 'Works offline' },
              { Icon: Bell, text: 'Get push notifications' },
              { Icon: Maximize, text: 'Full-screen app experience' },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#dfff4f]/10 flex items-center justify-center shrink-0">
                  <benefit.Icon className="w-4 h-4 text-[#dfff4f]" />
                </div>
                <span className="text-sm text-gray-300">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-[#131316]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 flex-1">
          {isInstalled ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-[#dfff4f] flex items-center justify-center mb-4">
                <Check size={32} className="text-black" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">App Installed!</h3>
              <p className="text-sm text-gray-400">Redirecting to login...</p>
            </motion.div>
          ) : isIOS ? (
            <>
              <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">How to Install on iPhone</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#dfff4f] flex items-center justify-center shrink-0 text-black font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium mb-1">Tap the Share button</p>
                    <p className="text-xs text-gray-500">At the bottom of your Safari browser</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-[#1c1c21] flex items-center justify-center border border-white/10">
                        <Share size={18} className="text-[#007AFF]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#dfff4f] flex items-center justify-center shrink-0 text-black font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium mb-1">Tap "Add to Home Screen"</p>
                    <p className="text-xs text-gray-500">Scroll down in the share menu</p>
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1c1c21] border border-white/10 w-fit">
                      <Plus size={16} className="text-[#007AFF]" />
                      <span className="text-xs text-white">Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#dfff4f] flex items-center justify-center shrink-0 text-black font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium mb-1">Tap "Add" in the top right</p>
                    <p className="text-xs text-gray-500">Confirm adding PayUp to your home screen</p>
                  </div>
                </div>
              </div>
            </>
          ) : deferredPrompt ? (
            <>
              <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">Quick Install</h2>
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#dfff4f] to-[#ccee3e] flex items-center justify-center mb-4 shadow-lg">
                  <Download size={28} className="text-black" />
                </div>
                <p className="text-sm text-gray-300 mb-6">Tap the button below to install PayUp directly to your device</p>
                <button
                  onClick={() => void handleInstallClick()}
                  disabled={installing}
                  className="w-full bg-[#dfff4f] text-black font-bold py-4 px-6 rounded-xl hover:bg-[#ccee3e] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {installing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Install App Now
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">How to Install</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#dfff4f] flex items-center justify-center shrink-0 text-black font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium mb-1">Open browser menu</p>
                    <p className="text-xs text-gray-500">Tap the three dots (⋮) in the top right</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#dfff4f] flex items-center justify-center shrink-0 text-black font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium mb-1">Select "Install app" or "Add to Home screen"</p>
                    <p className="text-xs text-gray-500">This will add PayUp to your apps</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Continue Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onContinue}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
        >
          {isInstalled ? 'Continue to Login' : 'Skip, continue to Login'}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </motion.button>

        <p className="text-center text-xs text-gray-600 mt-4">
          You can always install later from the app
        </p>
      </motion.div>
    </div>
  )
})
