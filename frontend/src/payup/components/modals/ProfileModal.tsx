import { Camera, MoreHorizontal, QrCode, Upload, X } from 'lucide-react'
import { useState } from 'react'

import type { User } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  currentUser: User
  onUpdateProfile: (u: User) => void
}

export function ProfileModal({ isOpen, onClose, currentUser, onUpdateProfile }: Props) {
  const [name, setName] = useState(currentUser.name)
  const [qrUrl, setQrUrl] = useState(currentUser.qr)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="relative h-32 bg-gradient-to-b from-[#1c1c21] to-[#131316]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm z-10"
          >
            <X size={20} />
          </button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div
              className={`w-24 h-24 rounded-full ${currentUser.color} flex items-center justify-center text-4xl font-bold text-black border-[6px] border-[#131316] shadow-xl`}
            >
              {currentUser.avatar}
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-[#dfff4f] rounded-full text-black hover:scale-110 transition-transform shadow-lg border border-[#131316]">
              <Camera size={14} />
            </button>
          </div>
        </div>

        <div className="pt-14 pb-8 px-6 text-center">
          <div className="mb-8">
            <label className="text-[10px] uppercase text-gray-500 font-mono tracking-widest mb-1 block">Display Name</label>
            <div className="flex items-center justify-center gap-2 relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-center text-2xl font-bold text-white focus:outline-none focus:border-b focus:border-[#dfff4f] w-full max-w-[200px] pb-1"
              />
              <MoreHorizontal size={16} className="text-gray-600 absolute right-4" />
            </div>
          </div>

          <div className="bg-[#0a0a0c] rounded-2xl p-6 border border-white/5 mb-6 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#dfff4f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xs font-mono text-gray-400 mb-4 flex items-center justify-center gap-2">
              <QrCode size={14} /> YOUR GCASH QR
            </h3>
            <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl mb-4 relative shadow-lg">
              <img src={qrUrl} alt="QR" className="w-full h-full mix-blend-multiply object-cover" />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer backdrop-blur-[2px]">
                <Upload size={24} className="text-white mb-2" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change QR</span>
              </div>
            </div>
            <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">QR URL</label>
            <input
              type="url"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              className="w-full bg-[#131316] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#dfff4f]"
            />
            <p className="text-[10px] text-gray-500 mt-2">Paste a new QR image URL for now.</p>
          </div>

          <button
            onClick={() => {
              onUpdateProfile({ ...currentUser, name: name.trim() || currentUser.name, qr: qrUrl.trim() || currentUser.qr })
              onClose()
            }}
            className="w-full py-4 bg-[#1c1c21] hover:bg-[#dfff4f] hover:text-black border border-white/10 rounded-xl font-bold font-mono transition-all uppercase tracking-widest acid-border"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

