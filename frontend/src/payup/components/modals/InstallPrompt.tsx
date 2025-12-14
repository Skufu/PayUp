import { useEffect, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isRunningStandalone(): boolean {
  const standaloneMq = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return standaloneMq || iosStandalone
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS] = useState<boolean>(() => isIOSDevice())
  const [isStandalone] = useState<boolean>(() => isRunningStandalone())

  useEffect(() => {
    if (isStandalone) return

    const dismissed = localStorage.getItem('installPromptDismissed')
    if (dismissed) return

    const showLater = () => {
      window.setTimeout(() => setShowPrompt(true), 10000)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      showLater()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if (isIOS) {
      showLater()
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isIOS, isStandalone])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('installPromptDismissed', 'true')
  }

  if (isStandalone || !showPrompt) return null

  return (
    <>
      {/* Android/Desktop Chrome - Native Install */}
      {deferredPrompt && !isIOS && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe">
          <div className="max-w-md mx-auto bg-gradient-to-br from-[#1c1c21] to-[#131316] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#dfff4f] flex items-center justify-center shrink-0">
                    <Smartphone size={24} className="text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Install PayUp</h3>
                    <p className="text-xs text-gray-400">Add to your home screen</p>
                  </div>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <p className="text-sm text-gray-300 mb-4">Get quick access and work offline with the PayUp app.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => void handleInstallClick()}
                  className="flex-1 bg-[#dfff4f] text-black font-bold py-3 px-4 rounded-xl hover:bg-[#ccee3e] transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS - Manual Instructions */}
      {isIOS && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe">
          <div className="max-w-md mx-auto bg-gradient-to-br from-[#1c1c21] to-[#131316] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#dfff4f] flex items-center justify-center shrink-0">
                    <Smartphone size={24} className="text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Install PayUp</h3>
                    <p className="text-xs text-gray-400">Add to Home Screen</p>
                  </div>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <div className="bg-[#0a0a0c] rounded-2xl p-4 mb-4">
                <p className="text-sm text-gray-300 mb-3">To install on iPhone:</p>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-[#dfff4f] font-bold shrink-0">1.</span>
                    <span>
                      Tap the <strong className="text-white">Share</strong> button at the bottom
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#dfff4f] font-bold shrink-0">2.</span>
                    <span>
                      Scroll and tap <strong className="text-white">"Add to Home Screen"</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#dfff4f] font-bold shrink-0">3.</span>
                    <span>
                      Tap <strong className="text-white">"Add"</strong> in the top right
                    </span>
                  </li>
                </ol>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

