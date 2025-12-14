import { Bell, Check, CheckCheck, Clock, Eye, Smartphone, Wallet, X } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { MOCK_PROOF_URL } from '../mock/data'
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
  onClose,
  onReviewPayment,
}: {
  payment: Payment
  currentUser: User
  onClose: () => void
  onReviewPayment: (paymentId: string, status: Payment['status']) => void
}) {
  const handleReject = useCallback(() => {
    onReviewPayment(payment.id, 'rejected')
    onClose()
  }, [onReviewPayment, payment.id, onClose])

  const handleApprove = useCallback(() => {
    onReviewPayment(payment.id, 'approved')
    onClose()
  }, [onReviewPayment, payment.id, onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-4 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
          <h3 className="font-bold text-white">Payment Proof</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-4 flex flex-col items-center">
          <div className="w-full bg-[#0a0a0c] rounded-xl overflow-hidden mb-4 border border-white/5 relative group">
            <img
              src={MOCK_PROOF_URL}
              alt="Proof"
              className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-mono">
              SAMPLE PROOF
            </div>
          </div>
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
                <span className={payment.status === 'approved' ? 'text-[#dfff4f]' : 'text-white'}>
                  {payment.status}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Modal to show nudger's QR code for payment
const NudgePayModal = memo(function NudgePayModal({
  nudge,
  onClose,
}: {
  nudge: Nudge
  onClose: () => void
}) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    setStatus('loading')
    api
      .getUserPublicProfile(nudge.senderId)
      .then((p) => {
        setQrUrl(p.qrUrl ?? '')
        setStatus('ready')
      })
      .catch(() => {
        setQrUrl('')
        setStatus('ready')
      })
  }, [nudge.senderId])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        {status === 'loading' ? (
          <div className="p-8 flex flex-col items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#dfff4f] mb-4" />
            <p className="text-sm text-gray-400">Loading QR code...</p>
          </div>
        ) : (
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

            <p className="text-[10px] text-gray-500 uppercase tracking-wider max-w-[200px]">
              Scan with GCash or Maya to pay
            </p>

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
      </div>
    </div>
  )
})

