import { memo } from 'react'
import { ArrowRight, Check, Pencil, Smartphone, Trash2 } from 'lucide-react'

import type { Expense, Group, User } from '../types'

type Props = {
  balances: Record<string, number>
  currentUser: User
  activeUsers: User[]
  currentGroup: Group | null
  expenses: Expense[]
  onPayClick: (userId: string, amount: number) => void
  onNudgeClick: (userId: string, amount: number) => void
  onDeleteExpense: (expenseId: string) => void
  onEditExpense: (expense: Expense) => void
}

export const WalletView = memo(function WalletView({
  balances,
  currentUser,
  activeUsers,
  currentGroup,
  expenses,
  onPayClick,
  onNudgeClick,
  onDeleteExpense,
  onEditExpense,
}: Props) {
  return (
    <div className="md:grid md:grid-cols-12 md:gap-8 md:items-start max-w-full mx-auto">
      {/* Left Column (Desktop) - Stats & Settlements */}
      <div className="md:col-span-4 xl:col-span-3 space-y-6">
        <section className="mt-4 md:mt-0">
          <BalanceCard balances={balances} currentUser={currentUser} expenses={expenses} />
        </section>

        {/* Desktop Settlements List - Only visible if there are settlements */}
        <section className="hidden md:block">
          <SettlementList
            balances={balances}
            currentUser={currentUser}
            activeUsers={activeUsers}
            onPayClick={onPayClick}
            onNudgeClick={onNudgeClick}
          />
        </section>
      </div>

      {/* Right Column (Desktop) - Feed */}
      <div className="md:col-span-8 xl:col-span-9">
        {/* Mobile Settlements - Visible only on mobile */}
        <section className="md:hidden mt-6 mb-8">
          <SettlementList
            balances={balances}
            currentUser={currentUser}
            activeUsers={activeUsers}
            onPayClick={onPayClick}
            onNudgeClick={onNudgeClick}
          />
        </section>

        <section className="bg-[#131316]/50 rounded-3xl border border-white/5 overflow-hidden min-h-[500px]">
          <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1c1c21]/50 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{currentGroup?.name} Feed</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">LATEST ACTIVITY</p>
            </div>
            <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-white font-mono font-bold border border-white/5">{expenses.length}</span>
          </div>

          <div className="p-4 space-y-3 md:p-6 md:space-y-4">
            {expenses.map((exp) => (
              <ExpenseItem
                key={exp.id}
                expense={exp}
                currentUser={currentUser}
                activeUsers={activeUsers}
                onDelete={onDeleteExpense}
                onEdit={onEditExpense}
              />
            ))}

            {expenses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-600">
                  <Smartphone size={24} />
                </div>
                <p className="text-gray-400 font-bold mb-1">No expenses yet</p>
                <p className="text-xs text-gray-600 font-mono">Tap the + button to add one!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
})

const BalanceCard = memo(function BalanceCard({ balances, currentUser, expenses }: { balances: Record<string, number>; currentUser: User; expenses: Expense[] }) {
  const myBalance = balances[currentUser.id] || 0
  const isOwed = myBalance > 0
  const isDebt = myBalance < 0

  // Calculate Group Total (sum of all expense amounts)
  const groupTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Calculate Your Share (sum of all splits for current user)
  const yourShare = expenses.reduce((sum, expense) => {
    return sum + (expense.splits[currentUser.id] || 0)
  }, 0)

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#1c1c21] border border-white/5 p-6 md:p-8 group transition-transform hover:scale-[1.01] duration-500 shadow-2xl z-10">
      {/* Dynamic Background Blob */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 md:w-56 md:h-56 rounded-full blur-[60px] md:blur-[80px] opacity-20 transition-colors duration-500 pointer-events-none ${isDebt ? 'bg-[#ff4f99]' : 'bg-[#dfff4f]'
          }`}
      />

      <div className="relative z-10">
        <div className="flex flex-col items-center text-center md:items-start md:text-left mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Net Position</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isDebt ? 'bg-[#ff4f99]' : isOwed ? 'bg-[#dfff4f]' : 'bg-gray-500'}`} />
            <span className="text-xs font-bold text-gray-300">
              {isDebt ? 'You Owe' : isOwed ? 'You are Owed' : 'Settled'}
            </span>
          </div>
          {/* Status Badge */}
          <div
            className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${isDebt
              ? 'border-[#ff4f99]/30 text-[#ff4f99] bg-[#ff4f99]/10'
              : isOwed
                ? 'border-[#dfff4f]/30 text-[#dfff4f] bg-[#dfff4f]/10'
                : 'border-gray-500/30 text-gray-400 bg-gray-500/10'
              }`}
          >
            {isDebt ? (
              <ArrowRight size={10} className="rotate-45" />
            ) : isOwed ? (
              <ArrowRight size={10} className="-rotate-45" />
            ) : (
              <Check size={10} />
            )}
            {isDebt ? 'Debt' : isOwed ? 'Credit' : 'All Good'}
          </div>
        </div>

        <div className="mb-6 text-center md:text-left">
          <span
            className={`font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight drop-shadow-lg block ${isDebt ? 'text-[#ff4f99]' : 'text-[#dfff4f]'
              }`}
          >
            {Math.abs(myBalance).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </span>
          <p className="text-[10px] text-gray-500 font-mono mt-2">
            {isDebt ? 'Total amount you need to pay back' : isOwed ? 'Total amount friends owe you' : 'You are all squared up!'}
          </p>
        </div>

        {/* Mini Stats Row */}
        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4 text-center md:text-left">
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Group Total</p>
            <p className="text-sm font-bold text-gray-300">
              {groupTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Your Share</p>
            <p className="text-sm font-bold text-gray-300">
              {yourShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})

const SettlementList = memo(function SettlementList({
  balances,
  currentUser,
  activeUsers,
  onPayClick,
  onNudgeClick,
}: {
  balances: Record<string, number>
  currentUser: User
  activeUsers: User[]
  onPayClick: (userId: string, amount: number) => void
  onNudgeClick: (userId: string, amount: number) => void
}) {
  const settlements = Object.entries(balances)
    .filter(([userId, amount]) => {
      if (userId === currentUser.id) return false
      if (Math.abs(amount) < 1) return false
      return true
    })
    .map(([userId, amount]) => {
      const userObj = activeUsers.find((u) => u.id === userId)
      if (!userObj) return null

      const myNet = balances[currentUser.id] || 0
      const isMeDebtor = myNet < -1
      const isTheyCreditor = amount > 1

      if (isMeDebtor && isTheyCreditor) {
        return { type: 'pay', user: userObj, amount: Math.min(Math.abs(myNet), amount) }
      }
      if (myNet > 1 && amount < -1) {
        return { type: 'collect', user: userObj, amount: Math.min(myNet, Math.abs(amount)) }
      }
      return null
    })
    .filter(Boolean) as { type: 'pay' | 'collect', user: User, amount: number }[]

  if (settlements.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 bg-[#1c1c21] p-8 flex flex-col items-center text-center relative z-10">
        <div className="w-12 h-12 rounded-full bg-[#131316] flex items-center justify-center mb-4 text-[#dfff4f] border border-white/5 shadow-lg">
          <Check size={20} />
        </div>
        <p className="text-sm font-bold text-white mb-1">All Settled Up</p>
        <p className="text-[10px] text-gray-500 font-mono tracking-wide">No pending settlements needed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 mb-24 md:mb-0">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h3 className="text-[10px] font-mono uppercase text-gray-500 tracking-widest">Settlements Needed</h3>
        <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-bold">{settlements.filter(s => s.type === 'pay').length} Pending</span>
      </div>

      {settlements.map((item) => {
        if (item.type === 'pay') {
          return (
            <div
              key={item.user.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5 hover:border-white/20 transition-all group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${item.user.color} flex items-center justify-center text-black font-bold text-sm shadow-md shrink-0`}
                >
                  {item.user.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-[#dfff4f] transition-colors truncate">
                    Pay {item.user.name}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {item.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onPayClick(item.user.id, item.amount)}
                className="bg-[#dfff4f] text-black px-4 py-2 rounded-xl text-[10px] font-bold font-mono hover:bg-[#ccee3e] transition-colors shadow-[0_0_15px_rgba(223,255,79,0.1)] shrink-0"
              >
                PAY
              </button>
            </div>
          )
        }

        if (item.type === 'collect') {
          return (
            <div
              key={item.user.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5 opacity-80 hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${item.user.color} flex items-center justify-center text-black font-bold text-sm opacity-80 shrink-0`}
                >
                  {item.user.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">{item.user.name}</p>
                  <p className="text-[10px] text-gray-600 font-mono">Owes you</p>
                </div>
              </div>
              <button
                onClick={() => onNudgeClick(item.user.id, item.amount)}
                className="text-[#ff4f99] text-[10px] font-bold font-mono px-3 py-1.5 rounded border border-[#ff4f99]/30 hover:bg-[#ff4f99]/10 transition-colors uppercase tracking-wider shrink-0"
              >
                Nudge
              </button>
            </div>
          )
        }
        return null
      })}
    </div>
  )
})

const CATEGORIES_MAP: Record<string, string> = {
  'Food': '🍔',
  'Transport': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Utilities': '💡',
  'Travel': '✈️',
  'Health': '🏥',
  'Other': '📦',
}

const ExpenseItem = memo(function ExpenseItem({
  expense,
  currentUser,
  activeUsers,
  onDelete,
  onEdit,
}: {
  expense: Expense
  currentUser: User
  activeUsers: User[]
  onDelete: (id: string) => void
  onEdit: (expense: Expense) => void
}) {
  const isPayer = expense.payerId === currentUser.id
  const isTransfer = expense.type === 'transfer'
  const myShare = expense.splits[currentUser.id] || 0
  const payer = activeUsers.find((u) => u.id === expense.payerId) || { name: 'Unknown' }

  return (
    <div className="group relative pl-6 pb-8 border-l border-white/10 last:border-0 last:pb-0 md:pl-0 md:pb-0 md:border-l-0 md:bg-[#131316] md:p-4 md:rounded-xl md:border md:border-white/5 md:hover:border-white/10 md:transition-all">
      <div
        className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full border-2 border-[#0a0a0c] md:hidden ${isPayer ? 'bg-[#dfff4f]' : isTransfer ? 'bg-[#ff4f99]' : 'bg-[#1c1c21]'
          }`}
      />
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold text-base truncate ${isTransfer ? 'text-[#ff4f99]' : 'text-white'}`}>{expense.title}</h4>
            {isTransfer ? (
              <span className="text-[9px] bg-[#ff4f99]/20 text-[#ff4f99] px-1.5 rounded border border-[#ff4f99]/30 shrink-0">
                TRANSFER
              </span>
            ) : expense.category && expense.category !== 'Other' && (
              <span className="text-[9px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded border border-white/10 shrink-0 flex items-center gap-1">
                <span>{CATEGORIES_MAP[expense.category] || '📦'}</span>
                {expense.category.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
            <span className={isPayer ? 'text-[#dfff4f]' : 'text-gray-400'}>{isPayer ? 'You' : payer.name}</span>
            <span>paid</span>
            <span className="text-white font-bold">
              {expense.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </span>
          </p>
        </div>

        <div className="flex items-start gap-3 shrink-0">
          {/* Context Badge (Owe/Receive) */}
          {!isPayer && myShare > 0 && !isTransfer && (
            <div className="px-2 py-1 rounded bg-[#ff4f99]/15 border border-[#ff4f99]/40 flex flex-col items-end">
              <span className="text-[8px] text-[#ff4f99] font-mono uppercase leading-none mb-0.5">You Owe</span>
              <span className="text-xs text-[#ff4f99] font-mono font-bold leading-none">
                {myShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
              </span>
            </div>
          )}
          {isTransfer && !isPayer && myShare > 0 && (
            <div className="px-2 py-1 rounded bg-[#dfff4f]/15 border border-[#dfff4f]/40 flex flex-col items-end">
              <span className="text-[8px] text-[#dfff4f] font-mono uppercase leading-none mb-0.5">Received</span>
              <span className="text-xs text-[#dfff4f] font-mono font-bold leading-none">
                {myShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
              </span>
            </div>
          )}

          {isPayer && (
            <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(expense)}
                className="p-2 text-gray-600 hover:text-[#dfff4f] hover:bg-white/5 rounded-lg transition-colors"
                title="Edit Expense"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(expense.id)}
                className="p-2 text-gray-600 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                title="Delete Expense"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Involved Users Avatars */}
      {isPayer && !isTransfer && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mr-1">Split with</span>
          <div className="flex -space-x-2 hover:space-x-0.5 transition-all">
            {Object.keys(expense.splits).map((uid) => {
              const u = activeUsers.find((usr) => usr.id === uid)
              if (!u) return null
              // Don't show payer in the split list if it's just them (though logic prevents this usually)
              if (uid === currentUser.id) return null

              return (
                <div
                  key={uid}
                  className={`w-6 h-6 rounded-full border border-[#131316] ${u.color} flex items-center justify-center text-[9px] text-black font-bold ring-2 ring-[#131316]`}
                  title={u.name}
                >
                  {u.avatar}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})