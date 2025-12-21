import { ArrowRight, Bell, Camera, Check, CheckCheck, Clock, Eye, ImageOff, Receipt, Smartphone, Upload, Wallet, X, ZoomIn } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../api/endpoints'
import type { Payment, User } from '../types'

type Nudge = {
  id: string
  groupId: string
  groupName: string
  senderId: string
  senderName: string
  amount: number
  message: string
  read: boolean
  createdAt: string
}

type Props = {
  payments: Payment[]
  currentUser: User
  activeUsers: User[]
  onReviewPayment: (paymentId: string, status: Payment['status']) => void
}

export const NotificationView = memo(function NotificationView({ payments, currentUser, activeUsers, onReviewPayment }: Props) {
  const qc = useQueryClient()
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedNudge, setSelectedNudge] = useState<Nudge | null>(null)

  const nudgesQuery = useQuery({
    queryKey: ['nudges'],
    queryFn: () => api.listNudges(),
  })
  const nudges = nudgesQuery.data ?? []
  const unreadNudges = nudges.filter((n) => !n.read)

  const handleMarkRead = async (nudgeId: string) => {
    await api.markNudgeRead(nudgeId)
    await qc.invalidateQueries({ queryKey: ['nudges'] })
    await qc.invalidateQueries({ queryKey: ['nudges', 'unread-count'] })
  }

  const handleMarkAllRead = async () => {
    await api.markAllNudgesRead()
    await qc.invalidateQueries({ queryKey: ['nudges'] })
    await qc.invalidateQueries({ queryKey: ['nudges', 'unread-count'] })
  }

  const allActivities = useMemo(() => {
    const incoming = payments.filter((p) => p.receiverId === currentUser.id)
    const outgoing = payments.filter((p) => p.senderId === currentUser.id)
    return [...incoming, ...outgoing].sort((a, b) => b.createdAt - a.createdAt)
  }, [payments, currentUser.id])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xs uppercase text-gray-500 font-mono tracking-widest px-2">Payment Notifications</h2>

      {unreadNudges.length > 0 && (
        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] text-gray-500 font-mono">
            {unreadNudges.length} unread nudge{unreadNudges.length === 1 ? '' : 's'}
          </p>
          <button
            onClick={handleMarkAllRead}
            className="text-[10px] text-[#dfff4f] hover:underline flex items-center gap-1 font-mono"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </div>
      )}

      {nudges.length > 0 && (
        <section className="bg-[#131316]/50 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-[#1c1c21]/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Bell className="text-orange-500" size={20} />
              <h3 className="text-sm font-bold text-white tracking-tight">Payment Reminders</h3>
            </div>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">FRIENDS NUDGING YOU</p>
          </div>
          <div className="p-4 space-y-3 md:p-6 md:space-y-4">
            {nudges.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all ${
                  n.read
                    ? 'bg-[#0a0a0c] border-white/5 opacity-60'
                    : 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-white">{n.senderName}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500 font-mono">{n.groupName}</span>
                      {!n.read && (
                        <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 break-words">{n.message}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-2 text-gray-500 hover:text-[#dfff4f] hover:bg-white/5 rounded-lg transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 font-mono">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-orange-500">
                      ₱{n.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                    <button
                      onClick={() => setSelectedNudge(n)}
                      className="bg-[#dfff4f] text-black px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono hover:bg-[#ccee3e] transition-colors flex items-center gap-1.5"
                    >
                      <Wallet size={12} />
                      PAY
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedNudge && (
        <NudgePayModal
          nudge={selectedNudge}
          onClose={() => setSelectedNudge(null)}
          onPaymentComplete={async () => {
            await qc.invalidateQueries({ queryKey: ['payments'] })
            await qc.invalidateQueries({ queryKey: ['nudges'] })
            setSelectedNudge(null)
          }}
        />
      )}

      {allActivities.length === 0 && nudges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 opacity-30">
          <Bell size={48} className="mb-4" />
          <p className="text-sm font-mono">No notifications yet.</p>
        </div>
      )}

      {allActivities.map((payment) => {
        const isIncoming = payment.receiverId === currentUser.id
        const otherUser =
          activeUsers.find((u) => u.id === (isIncoming ? payment.senderId : payment.receiverId)) ?? {
            id: 'unknown',
            name: 'Unknown',
            avatar: '?',
            color: 'bg-gray-500',
            qr: '',
          }

        return (
          <div
            key={payment.id}
            className="relative p-4 rounded-2xl bg-[#131316] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full ${otherUser.color} flex items-center justify-center text-black font-bold text-sm relative`}
              >
                {otherUser.avatar}
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#131316] flex items-center justify-center ${
                    payment.status === 'approved'
                      ? 'bg-[#dfff4f]'
                      : payment.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                >
                  {payment.status === 'approved' ? <Check size={10} color="black" /> : <Clock size={10} color="black" />}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {isIncoming ? `${otherUser.name} paid you` : `You paid ${otherUser.name}`}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {payment.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })} • {payment.status}
                </p>
              </div>
            </div>

            {isIncoming && payment.status === 'pending' && (
              <button
                onClick={() => setSelectedPayment(payment)}
                className="bg-[#dfff4f] text-black px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono hover:bg-[#ccee3e] transition-colors"
              >
                REVIEW
              </button>
            )}

            {(!isIncoming || payment.status !== 'pending') && (
              <button onClick={() => setSelectedPayment(payment)} className="p-2 text-gray-600 hover:text-white">
                <Eye size={18} />
              </button>
            )}
          </div>
        )
      })}

      {selectedPayment && (
        <PaymentProofModal
          payment={selectedPayment}
          currentUser={currentUser}
          activeUsers={activeUsers}
          onClose={() => setSelectedPayment(null)}
          onReviewPayment={onReviewPayment}
        />
      )}
    </div>
  )
})

// Extracted modal component for better performance
const PaymentProofModal = memo(function PaymentProofModal({
  payment,
  currentUser,
  activeUsers,
  onClose,
  onReviewPayment,
}: {
  payment: Payment
  currentUser: User
  activeUsers: User[]
  onClose: () => void
  onReviewPayment: (paymentId: string, status: Payment['status']) => void
}) {
  const [isZoomed, setIsZoomed] = useState(false)

  const sender = activeUsers.find((u) => u.id === payment.senderId) ?? {
    id: 'unknown',
    name: 'Unknown',
    avatar: '?',
    color: 'bg-gray-500',
    qr: '',
  }

  const handleReject = useCallback(() => {
    onReviewPayment(payment.id, 'rejected')
    onClose()
  }, [onReviewPayment, payment.id, onClose])

  const handleApprove = useCallback(() => {
    onReviewPayment(payment.id, 'approved')
    onClose()
  }, [onReviewPayment, payment.id, onClose])

  const proofUrl = payment.proofUrl

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-4 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
          <h3 className="font-bold text-white">Payment Proof</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
        <div className="p-4 flex flex-col items-center">
          {/* Sender info */}
          <div className="w-full flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl">
            <div className={`w-10 h-10 rounded-full ${sender.color} flex items-center justify-center text-black font-bold text-sm`}>
              {sender.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{sender.name}</p>
              <p className="text-[10px] text-gray-500 font-mono">
                {new Date(payment.createdAt).toLocaleString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Proof image */}
          {proofUrl ? (
            <div
              className="w-full bg-[#0a0a0c] rounded-xl overflow-hidden mb-4 border border-white/5 relative group cursor-pointer"
              onClick={() => setIsZoomed(true)}
            >
              <img
                src={proofUrl}
                alt="Payment proof"
                className="w-full h-auto max-h-[300px] object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn size={32} className="text-white" />
              </div>
            </div>
          ) : (
            <div className="w-full h-40 bg-[#0a0a0c] rounded-xl mb-4 border border-white/5 flex flex-col items-center justify-center">
              <ImageOff size={32} className="text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No proof uploaded</p>
            </div>
          )}

          <div className="text-center mb-6">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Amount Paid</p>
            <p className="text-3xl font-mono font-bold text-[#dfff4f]">
              {payment.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </p>
          </div>
          {payment.status === 'pending' && payment.receiverId === currentUser.id ? (
            <div className="flex w-full gap-2">
              <button
                onClick={handleReject}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-colors"
              >
                REJECT
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-3 rounded-xl bg-[#dfff4f] text-black font-bold hover:bg-[#ccee3e] transition-colors"
              >
                APPROVE
              </button>
            </div>
          ) : (
            <div className="w-full text-center p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-xs text-gray-400 font-mono uppercase">
                Status:{' '}
                <span className={payment.status === 'approved' ? 'text-[#dfff4f]' : payment.status === 'rejected' ? 'text-red-500' : 'text-white'}>
                  {payment.status}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen zoom modal */}
      {isZoomed && proofUrl && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setIsZoomed(false)}
          >
            <X size={24} className="text-white" />
          </button>
          <img
            src={proofUrl}
            alt="Payment proof (full size)"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  )
})

// Modal to show nudger's QR code and handle payment with proof upload
const NudgePayModal = memo(function NudgePayModal({
  nudge,
  onClose,
  onPaymentComplete,
}: {
  nudge: Nudge
  onClose: () => void
  onPaymentComplete: () => void
}) {
  const [step, setStep] = useState<'loading' | 'scan' | 'upload' | 'verifying'>('loading')
  const [qrUrl, setQrUrl] = useState<string>('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getUserPublicProfile(nudge.senderId)
      .then((p) => {
        if (!cancelled) {
          setQrUrl(p.qrUrl ?? '')
          setStep('scan')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrUrl('')
          setStep('scan')
        }
      })
    return () => {
      cancelled = true
    }
  }, [nudge.senderId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = () => setProofPreview(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  const handleSubmitPayment = async () => {
    if (!proofFile) return
    setStep('verifying')
    try {
      const uploaded = await api.uploadPaymentProof(proofFile)
      await api.createPayment(nudge.groupId, nudge.senderId, nudge.amount, uploaded.proofUrl)
      setTimeout(() => {
        onPaymentComplete()
      }, 2500)
    } catch {
      setStep('upload')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        {step === 'loading' && (
          <div className="p-8 flex flex-col items-center justify-center h-[520px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#dfff4f] mb-4" />
            <p className="text-sm text-gray-400">Loading QR code...</p>
          </div>
        )}

        {step === 'scan' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-[#dfff4f]" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-xl font-bold text-black mb-3 shadow-xl border-4 border-[#131316]">
              {nudge.senderName.slice(0, 2).toUpperCase()}
            </div>

            <h3 className="font-display text-xl font-bold text-white mb-1">Pay {nudge.senderName}</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">{nudge.groupName}</p>
            <p className="font-mono text-[#dfff4f] text-3xl font-bold mb-6 tracking-tight">
              ₱{nudge.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>

            {qrUrl ? (
              <div className="bg-white p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] transform transition-transform hover:scale-105 duration-300">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48 mix-blend-multiply object-contain" />
              </div>
            ) : (
              <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-8 mb-6 w-full">
                <p className="text-sm text-gray-400 mb-2">No QR uploaded</p>
                <p className="text-xs text-gray-600">Ask {nudge.senderName} to add their payment QR in Profile.</p>
              </div>
            )}

            <p className="text-[10px] text-gray-500 mb-4 uppercase tracking-wider">Scan with GCash or Maya to pay</p>

            <button
              onClick={() => setStep('upload')}
              className="w-full bg-[#3b82f6] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Camera size={18} /> I Have Paid
            </button>

            <div className="mt-4 flex justify-center gap-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Smartphone size={14} /> <span>GCash</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <div className="w-3 h-3 rounded-full bg-gray-500" /> <span>Maya</span>
              </div>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="p-8 flex flex-col items-center text-center h-[520px] justify-center relative">
            <button
              onClick={() => setStep('scan')}
              className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors"
            >
              <ArrowRight className="rotate-180" size={20} />
            </button>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-display text-lg font-bold text-white mb-2">Upload Payment Proof</h3>
            <p className="text-xs text-gray-500 font-mono mb-6">
              ₱{nudge.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} to {nudge.senderName}
            </p>

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
              onChange={handleFileChange}
            />

            <button
              disabled={!proofFile}
              onClick={handleSubmitPayment}
              className="w-full bg-[#dfff4f] text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                <Upload size={18} /> SUBMIT PROOF
              </span>
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="p-8 flex flex-col items-center text-center h-[520px] justify-center bg-[#dfff4f] relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl relative z-10">
              <Check size={40} className="text-[#dfff4f]" strokeWidth={4} />
            </div>
            <h3 className="font-display text-3xl font-bold text-black relative z-10">Sent!</h3>
            <p className="text-black/70 mt-2 font-mono text-sm max-w-[200px] leading-tight relative z-10">
              Wait for {nudge.senderName} to confirm receipt.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

