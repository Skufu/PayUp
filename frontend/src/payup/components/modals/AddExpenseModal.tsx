import { ArrowLeftRight, ArrowRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { User } from '../../types'

type SplitMode = 'equal' | 'itemized'
type TxType = 'expense' | 'transfer'

type Props = {
  isOpen: boolean
  onClose: () => void
  currentUser: User
  activeUsers: User[]
  initialMode?: TxType
  onAdd: (expense: {
    title: string
    amount: number
    payerId: string
    mode?: string
    type: TxType
    splits: Record<string, number>
  }) => void
}

export function AddExpenseModal({
  isOpen,
  onClose,
  currentUser,
  activeUsers,
  initialMode = 'expense',
  onAdd,
}: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<SplitMode>('equal')
  const [splits, setSplits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    activeUsers.forEach((u) => (initial[u.id] = 0))
    return initial
  })
  const [transactionType, setTransactionType] = useState<TxType>(initialMode)
  const [transferReceiver, setTransferReceiver] = useState<string | null>(() => {
    const others = activeUsers.filter((u) => u.id !== currentUser.id)
    return others[0]?.id ?? null
  })

  const totalItemized = useMemo(() => Object.values(splits).reduce((a, b) => a + b, 0), [splits])
  const totalAmt = Number(amount || 0)
  const remainder = totalAmt - totalItemized

  const handleItemizedChange = (uid: string, val: string) => {
    const v = Number(val) || 0
    setSplits((prev) => {
      const next = { ...prev, [uid]: v }
      const nextTotal = Object.values(next).reduce((a, b) => a + b, 0)
      // auto-update main amount when it matches previous total
      if (!amount || Number(amount) === 0 || Math.abs(Number(amount) - totalItemized) < 0.01) {
        setAmount(nextTotal > 0 ? String(nextTotal) : '')
      }
      return next
    })
  }

  const handleSubmit = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) return

    const finalSplits: Record<string, number> = {}

    if (transactionType === 'transfer') {
      if (!transferReceiver) return
      finalSplits[transferReceiver] = amt
    } else if (mode === 'equal') {
      const splitAmount = amt / activeUsers.length
      activeUsers.forEach((u) => (finalSplits[u.id] = splitAmount))
    } else {
      const remainderPerPerson = remainder > 0 ? remainder / activeUsers.length : 0
      activeUsers.forEach((u) => {
        finalSplits[u.id] = (splits[u.id] || 0) + remainderPerPerson
      })
    }

    onAdd({
      title: transactionType === 'transfer' ? 'Cash Transfer' : title,
      amount: amt,
      payerId: currentUser.id,
      mode: transactionType === 'transfer' ? 'transfer' : mode,
      type: transactionType,
      splits: finalSplits,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#131316] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            {transactionType === 'transfer' ? (
              <>
                <ArrowLeftRight className="text-[#ff4f99]" /> Record Transfer
              </>
            ) : (
              'Add Expense'
            )}
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-8 flex-1">
          {/* Transaction type selector */}
          <div className="bg-[#0a0a0c] p-1.5 rounded-xl flex gap-1 border border-white/5">
            <button
              onClick={() => setTransactionType('expense')}
              className={`flex-1 py-3 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wide ${
                transactionType === 'expense' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setTransactionType('transfer')}
              className={`flex-1 py-3 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wide ${
                transactionType === 'transfer' ? 'bg-[#ff4f99] text-black shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              Transfer
            </button>
          </div>

          {transactionType === 'expense' && (
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Description</label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Jollibee, Gas"
                className="w-full bg-transparent border-b border-white/10 py-2 text-xl font-bold text-white focus:outline-none focus:border-[#dfff4f] placeholder-white/10 transition-colors"
              />
            </div>
          )}

          {transactionType === 'transfer' && (
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Receiver</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {activeUsers
                  .filter((u) => u.id !== currentUser.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setTransferReceiver(u.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                        transferReceiver === u.id
                          ? 'bg-[#ff4f99] text-white border-[#ff4f99]'
                          : 'bg-transparent border-white/20 text-gray-400'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[8px]">
                        {u.avatar}
                      </div>
                      <span className="text-xs font-bold">{u.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">
              {mode === 'itemized' ? 'Total Amount (Auto-Calculated)' : 'Amount'}
            </label>
            <div className="relative group">
              <span
                className={`absolute left-0 top-2 text-2xl font-mono transition-colors ${
                  amount ? (transactionType === 'transfer' ? 'text-[#ff4f99]' : 'text-[#dfff4f]') : 'text-gray-600'
                }`}
              >
                ₱
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-transparent border-b border-white/10 py-2 pl-8 text-4xl font-mono font-bold focus:outline-none placeholder-white/5 transition-colors ${
                  transactionType === 'transfer'
                    ? 'text-[#ff4f99] focus:border-[#ff4f99]'
                    : mode === 'itemized'
                      ? 'text-white/30 focus:border-[#dfff4f] focus:text-white'
                      : 'text-[#dfff4f] focus:border-[#dfff4f]'
                }`}
              />
            </div>
          </div>

          {transactionType === 'expense' && (
            <div className="space-y-4">
              <div className="bg-[#0a0a0c] p-1.5 rounded-xl flex gap-1 border border-white/5">
                <button
                  onClick={() => setMode('equal')}
                  className={`flex-1 py-3 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wide ${
                    mode === 'equal' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Split Equally
                </button>
                <button
                  onClick={() => setMode('itemized')}
                  className={`flex-1 py-3 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wide ${
                    mode === 'itemized' ? 'bg-[#dfff4f] text-black shadow-sm' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Hybrid Split
                </button>
              </div>

              {mode === 'itemized' && (
                <div className="space-y-3 animate-slide-up bg-[#0a0a0c] p-4 rounded-xl border border-white/10 shadow-inner">
                  <p className="text-[10px] text-[#dfff4f] mb-2 font-mono uppercase font-bold tracking-wider">
                    Assign Individual Costs
                  </p>
                  {activeUsers.map((u) => {
                    const isActive = (splits[u.id] || 0) > 0
                    return (
                      <div key={u.id} className="flex items-center gap-3 py-1">
                        <div
                          className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-xs font-bold text-black shadow-sm transition-all ${
                            isActive ? 'ring-2 ring-[#dfff4f] scale-110' : 'opacity-70'
                          }`}
                        >
                          {u.avatar}
                        </div>
                        <span className={`flex-1 text-sm font-medium transition-colors ${isActive ? 'text-[#dfff4f]' : 'text-white'}`}>
                          {u.name}
                        </span>
                        <input
                          type="number"
                          placeholder="0"
                          value={splits[u.id] === 0 ? '' : splits[u.id]}
                          onChange={(e) => handleItemizedChange(u.id, e.target.value)}
                          className={`w-28 bg-[#1c1c21] border rounded-lg px-3 py-2 text-right font-mono text-lg text-white focus:outline-none transition-all placeholder-white/10 ${
                            isActive ? 'border-[#dfff4f] bg-[#dfff4f]/10' : 'border-white/20 focus:border-[#dfff4f]'
                          }`}
                        />
                      </div>
                    )
                  })}
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Shared Remainder</span>
                    <span className={`font-mono font-bold ${remainder < 0 ? 'text-red-500' : 'text-white'}`}>
                      {remainder.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-[#1c1c21]">
          <button
            onClick={handleSubmit}
            disabled={(!title && transactionType === 'expense') || !amount}
            className={`w-full text-black font-bold font-mono py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 acid-border shadow-lg ${
              transactionType === 'transfer' ? 'bg-[#ff4f99] hover:bg-[#ff7eb6]' : 'bg-[#dfff4f] hover:bg-[#ccee3e]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {transactionType === 'transfer' ? 'RECORD TRANSFER' : 'CONFIRM EXPENSE'}{' '}
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

