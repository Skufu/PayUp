import { LogOut, UserMinus, Users, X } from 'lucide-react'

import type { User } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  activeUsers: User[]
  balances: Record<string, number>
  currentUser: User
  onLeave: () => void
  onRemove: (userId: string) => void
}

export function MembersModal({ isOpen, onClose, activeUsers, balances, currentUser, onLeave, onRemove }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#131316] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[70vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-[#dfff4f]" /> Group Members
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
          {activeUsers.map((user) => {
            const bal = balances[user.id] || 0
            const isPositive = bal > 0
            const isNegative = bal < 0
            return (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${user.color} flex items-center justify-center text-black font-bold`}>
                    {user.avatar}
                  </div>
                  <span className="font-bold text-white text-sm">{user.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-right ${isPositive ? 'text-[#dfff4f]' : isNegative ? 'text-[#ff4f99]' : 'text-gray-500'}`}>
                    <span className="text-[10px] font-mono block uppercase opacity-70 mb-0.5">
                      {isPositive ? 'Is Owed' : isNegative ? 'Owes' : 'Settled'}
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {Math.abs(bal).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    </span>
                  </div>

                  {user.id === currentUser.id ? (
                    <button
                      onClick={onLeave}
                      className="p-2 text-gray-500 hover:text-[#ff4f99] hover:bg-white/5 rounded-lg transition-colors"
                      title="Leave Group"
                    >
                      <LogOut size={16} />
                    </button>
                  ) : (
                    activeUsers.find((u) => u.id === currentUser.id)?.role === 'admin' && (
                      <button
                        onClick={() => onRemove(user.id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                        title="Remove Member"
                      >
                        <UserMinus size={16} />
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}











