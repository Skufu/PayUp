import { ArrowRight, Camera, Check, Receipt, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../../api/endpoints'
import type { User } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  payeeId: string | null
  amount: number
  currentUser: User
  activeUsers: User[]
  onSubmitPayment: (payeeId: string, amount: number, proofUrl?: string) => void
}

export function PaymentModal({ isOpen, onClose, payeeId, amount, activeUsers, onSubmitPayment }: Props) {
  const [status, setStatus] = useState<'loading' | 'scan' | 'upload' | 'verifying'>('loading')
  const [payeeQR, setPayeeQR] = useState<string>('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const payee = activeUsers.find((u) => u.id === payeeId)

  useEffect(() => {
    if (!isOpen || !payeeId) return
    setStatus('loading')
    api
      .getUserPublicProfile(payeeId)
      .then((p) => {
        setPayeeQR(p.qrUrl ?? '')
        setStatus('scan')
      })
      .catch(() => {
        setPayeeQR('')
        setStatus('scan')
      })
  }, [isOpen, payeeId])

  if (!isOpen || !payee) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        {status === 'loading' && (
          <div className="p-8 flex flex-col items-center justify-center h-[520px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#dfff4f] mb-4"></div>
            <p className="text-sm text-gray-400">Loading QR code...</p>
          </div>
        )}

        {status === 'scan' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#dfff4f] to-[#ff4f99]" />
            <div
              className={`w-16 h-16 rounded-full ${payee.color} flex items-center justify-center text-2xl font-bold text-black mb-4 shadow-xl border-4 border-[#131316] relative z-10`}
            >
              {payee.avatar}
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-1">Pay {payee.name}</h3>
            <p className="font-mono text-[#dfff4f] text-3xl font-bold mb-6 tracking-tight">
              {amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </p>
            {payeeQR ? (
              <div className="bg-white p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] transform transition-transform hover:scale-105 duration-300">
                <img src={payeeQR} alt="QR Code" className="w-48 h-48 mix-blend-multiply object-contain" />
              </div>
            ) : (
              <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-8 mb-6 w-full">
                <p className="text-sm text-gray-400 mb-2">No QR uploaded</p>
                <p className="text-xs text-gray-600">Ask {payee.name} to add their payment QR in Profile.</p>
              </div>
            )}
            <p className="text-[10px] text-gray-500 mb-6 max-w-[200px] uppercase tracking-wider">Scan with GCash • Upload Proof</p>
            <button
              onClick={() => setStatus('upload')}
              className="w-full bg-[#3b82f6] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Camera size={18} /> I Have Paid
            </button>
          </div>
        )}

        {status === 'upload' && (
          <div className="p-8 flex flex-col items-center text-center h-[520px] justify-center relative">
            <button onClick={() => setStatus('scan')} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors">
              <ArrowRight className="rotate-180" size={20} />
            </button>
            {proofPreview ? (
              <div className="relative w-full mb-6">
                <img src={proofPreview} alt="Payment proof" className="w-full rounded-2xl border border-white/10" />
                <button
                  onClick={() => {
                    setProofFile(null)
                    setProofPreview('')
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500/90 rounded-lg"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-56 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center mb-6 hover:border-[#dfff4f] hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-[#1c1c21] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Receipt className="text-gray-500 group-hover:text-[#dfff4f]" size={28} />
                </div>
                <span className="text-sm text-gray-500 font-mono">Tap to upload receipt</span>
                <span className="text-xs text-gray-600 mt-1">JPG/PNG/WEBP, max 10MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!file.type.startsWith('image/')) return
                if (file.size > 10 * 1024 * 1024) return
                setProofFile(file)
                const reader = new FileReader()
                reader.onload = () => setProofPreview(String(reader.result ?? ''))
                reader.readAsDataURL(file)
              }}
            />

            <button
              disabled={!proofFile}
              onClick={async () => {
                if (!proofFile) return
                setStatus('verifying')
                try {
                  const up = await api.uploadPaymentProof(proofFile)
                  await onSubmitPayment(payee.id, amount, up.proofUrl)
                } finally {
                  setTimeout(onClose, 2500)
                }
              }}
              className="w-full bg-[#dfff4f] text-black font-bold py-4 rounded-xl acid-border shadow-[0_0_20px_rgba(223,255,79,0.2)]"
            >
              <span className="flex items-center justify-center gap-2">
                <Upload size={18} /> SUBMIT PROOF
              </span>
            </button>
          </div>
        )}

        {status === 'verifying' && (
          <div className="p-8 flex flex-col items-center text-center h-[520px] justify-center bg-[#dfff4f] relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <button onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl relative z-10">
              <Check size={40} className="text-[#dfff4f]" strokeWidth={4} />
            </div>
            <h3 className="font-display text-3xl font-bold text-black relative z-10">Sent!</h3>
            <p className="text-black/70 mt-2 font-mono text-sm max-w-[200px] leading-tight relative z-10">
              Wait for {payee.name} to confirm receipt.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

