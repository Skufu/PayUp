import { Bell, Check, Clock, Eye, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { MOCK_PROOF_URL } from '../mock/data'
import type { Payment, User } from '../types'

type Props = {
  payments: Payment[]
  currentUser: User
  activeUsers: User[]
  onReviewPayment: (paymentId: string, status: Payment['status']) => void
}

export function NotificationView({ payments, currentUser, activeUsers, onReviewPayment }: Props) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const allActivities = useMemo(() => {
    const incoming = payments.filter((p) => p.receiverId === currentUser.id)
    const outgoing = payments.filter((p) => p.senderId === currentUser.id)
    return [...incoming, ...outgoing].sort((a, b) => b.createdAt - a.createdAt)
  }, [payments, currentUser.id])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xs uppercase text-gray-500 font-mono tracking-widest px-2">Payment Notifications</h2>

      {allActivities.length === 0 && (
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedPayment(null)} />
          <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-4 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
              <h3 className="font-bold text-white">Payment Proof</h3>
              <button onClick={() => setSelectedPayment(null)}>
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
                  {selectedPayment.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                </p>
              </div>
              {selectedPayment.status === 'pending' && selectedPayment.receiverId === currentUser.id ? (
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => {
                      onReviewPayment(selectedPayment.id, 'rejected')
                      setSelectedPayment(null)
                    }}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-colors"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={() => {
                      onReviewPayment(selectedPayment.id, 'approved')
                      setSelectedPayment(null)
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#dfff4f] text-black font-bold hover:bg-[#ccee3e] transition-colors"
                  >
                    APPROVE
                  </button>
                </div>
              ) : (
                <div className="w-full text-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-400 font-mono uppercase">
                    Status:{' '}
                    <span className={selectedPayment.status === 'approved' ? 'text-[#dfff4f]' : 'text-white'}>
                      {selectedPayment.status}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

