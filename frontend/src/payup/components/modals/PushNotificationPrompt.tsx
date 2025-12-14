import { useState } from 'react'
import { Bell, X } from 'lucide-react'

import { pushManager } from '../../push/pushManager'
import { api } from '../../api/endpoints'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function PushNotificationPrompt({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  const handleEnable = async () => {
    setLoading(true)
    try {
      await pushManager.subscribe((endpoint, keys) => api.subscribePush(endpoint, keys))
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Bell className="text-[#dfff4f]" size={24} />
            Enable Notifications
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#dfff4f]/10 flex items-center justify-center">
            <Bell size={40} className="text-[#dfff4f]" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-2">Stay Updated!</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Get instant notifications when friends nudge you about payments, even when the app is closed.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full bg-[#dfff4f] text-black font-bold py-4 rounded-xl hover:bg-[#ccee3e] transition-colors disabled:opacity-50"
            >
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-gray-600">You can change this anytime in settings</p>
        </div>
      </div>
    </div>
  )
}

