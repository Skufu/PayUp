import { Smartphone, X } from 'lucide-react'

import type { User } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  currentUser: User
}

export function MyQrModal({ isOpen, onClose, currentUser }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#dfff4f] rounded-[2rem] overflow-hidden shadow-2xl animate-slide-up p-8 text-center text-black">
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="w-20 h-20 bg-black rounded-full mx-auto flex items-center justify-center mb-4 shadow-xl text-[#dfff4f] font-bold text-3xl border-4 border-white/20">
          {currentUser.avatar}
        </div>

        <h2 className="font-display text-2xl font-bold mb-1">@{currentUser.name}</h2>
        <p className="font-mono text-sm opacity-70 mb-8 uppercase tracking-widest">Scan to Pay Me</p>

        <div className="bg-white p-4 rounded-2xl shadow-xl rotate-1 hover:rotate-0 transition-transform duration-300">
          {currentUser.qr ? (
            <img src={currentUser.qr} className="w-full mix-blend-multiply" alt="QR" />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-gray-700 font-mono text-xs">
              No QR uploaded yet
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <div className="flex items-center gap-2 opacity-60">
            <Smartphone size={16} /> <span>GCash</span>
          </div>
          <div className="flex items-center gap-2 opacity-60">
            <div className="w-4 h-4 rounded-full bg-black" /> <span>Maya</span>
          </div>
        </div>
      </div>
    </div>
  )
}

