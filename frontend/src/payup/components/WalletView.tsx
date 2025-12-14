import { ArrowRight, Check, Smartphone, Trash2 } from 'lucide-react'

import type { Expense, Group, User } from '../types'

type Props = {
  balances: Record<string, number>
  currentUser: User
  activeUsers: User[]
  currentGroup: Group | null
  expenses: Expense[]
  onPayClick: (userId: string, amount: number) => void
  onDeleteExpense: (expenseId: string) => void
}

export function WalletView({
  balances,
  currentUser,
  activeUsers,
  currentGroup,
  expenses,
  onPayClick,
  onDeleteExpense,
}: Props) {
  return (
    <>
      <section className="mt-4">
        <BalanceCard balances={balances} currentUser={currentUser} />
      </section>

      <SettlementList balances={balances} currentUser={currentUser} activeUsers={activeUsers} onPayClick={onPayClick} />

      <section>
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-[10px] font-mono uppercase text-gray-500 tracking-widest">{currentGroup?.name} Feed</h3>
          <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400 font-mono">{expenses.length}</span>
        </div>

        <div className="space-y-4 border-l border-white/5 ml-2 pl-2">
          {expenses.map((exp) => (
            <ExpenseItem
              key={exp.id}
              expense={exp}
              currentUser={currentUser}
              activeUsers={activeUsers}
              onDelete={onDeleteExpense}
            />
          ))}

          {expenses.length === 0 && (
            <div className="py-12 px-6 rounded-2xl border border-dashed border-white/10 text-center text-gray-600 italic text-sm font-mono">
              No expenses yet.
              <br />
              Tap the + button to add one!
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function BalanceCard({ balances, currentUser }: { balances: Record<string, number>; currentUser: User }) {
  const myBalance = balances[currentUser.id] || 0
  const isOwed = myBalance > 0
  const isDebt = myBalance < 0

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#1c1c21] border border-white/5 p-8 mb-8 group transition-transform hover:scale-[1.02] duration-500">
      <div
        className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 transition-colors duration-500 ${
          isDebt ? 'bg-[#ff4f99]' : 'bg-[#dfff4f]'
        }`}
      />
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 border border-white/10 px-2 py-0.5 rounded-full">
          Net Position
        </span>
        <div className="flex items-baseline gap-1 my-2">
          <span
            className={`font-display text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-2xl ${
              isDebt ? 'text-[#ff4f99]' : 'text-[#dfff4f]'
            }`}
          >
            {Math.abs(myBalance).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </span>
        </div>
        <div
          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2 ${
            isDebt
              ? 'border-[#ff4f99]/30 text-[#ff4f99] bg-[#ff4f99]/10'
              : 'border-[#dfff4f]/30 text-[#dfff4f] bg-[#dfff4f]/10'
          }`}
        >
          {isDebt ? (
            <>
              <ArrowRight size={12} className="rotate-45" /> You Owe Total
            </>
          ) : isOwed ? (
            <>
              <ArrowRight size={12} className="-rotate-45" /> You are Owed
            </>
          ) : (
            <>
              <Check size={12} /> All Settled
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SettlementList({
  balances,
  currentUser,
  activeUsers,
  onPayClick,
}: {
  balances: Record<string, number>
  currentUser: User
  activeUsers: User[]
  onPayClick: (userId: string, amount: number) => void
}) {
  return (
    <div className="space-y-3 mb-24">
      <h3 className="text-[10px] font-mono uppercase text-gray-500 mb-4 px-2 tracking-widest">Settlements Needed</h3>
      {Object.entries(balances).map(([userId, amount]) => {
        if (userId === currentUser.id) return null
        if (Math.abs(amount) < 1) return null
        const userObj = activeUsers.find((u) => u.id === userId)
        if (!userObj) return null

        const myNet = balances[currentUser.id] || 0
        const isMeDebtor = myNet < -1
        const isTheyCreditor = amount > 1

        if (isMeDebtor && isTheyCreditor) {
          return (
            <div
              key={userId}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full ${userObj.color} flex items-center justify-center text-black font-bold text-lg shadow-lg`}
                >
                  {userObj.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-[#dfff4f] transition-colors">
                    Pay {userObj.name}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">Tap to view QR</p>
                </div>
              </div>
              <button
                onClick={() => onPayClick(userId, Math.min(Math.abs(myNet), amount))}
                className="bg-[#dfff4f] text-black px-5 py-2.5 rounded-xl text-xs font-bold font-mono hover:bg-[#ccee3e] transition-colors acid-border shadow-[0_0_15px_rgba(223,255,79,0.2)]"
              >
                PAY NOW
              </button>
            </div>
          )
        }

        if (myNet > 1 && amount < -1) {
          return (
            <div
              key={userId}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5 opacity-80 hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full ${userObj.color} flex items-center justify-center text-black font-bold text-sm opacity-80`}
                >
                  {userObj.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">{userObj.name} owes you</p>
                </div>
              </div>
              <button className="text-[#ff4f99] text-[10px] font-bold font-mono px-3 py-1.5 rounded border border-[#ff4f99]/30 hover:bg-[#ff4f99]/10 transition-colors uppercase tracking-wider">
                Nudge
              </button>
            </div>
          )
        }

        return null
      })}
      {Math.abs(balances[currentUser.id] || 0) < 1 && (
        <div className="text-center py-12 opacity-30 flex flex-col items-center">
          <Smartphone size={48} className="mb-4 text-gray-500" />
          <p className="text-sm font-mono">No active debts.</p>
        </div>
      )}
    </div>
  )
}

function ExpenseItem({
  expense,
  currentUser,
  activeUsers,
  onDelete,
}: {
  expense: Expense
  currentUser: User
  activeUsers: User[]
  onDelete: (id: string) => void
}) {
  const isPayer = expense.payerId === currentUser.id
  const isTransfer = expense.type === 'transfer'
  const myShare = expense.splits[currentUser.id] || 0
  const payer = activeUsers.find((u) => u.id === expense.payerId) || { name: 'Unknown' }

  return (
    <div className="group relative pl-6 pb-8 border-l border-white/10 last:border-0 last:pb-0">
      <div
        className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full border-2 border-[#0a0a0c] ${
          isPayer ? 'bg-[#dfff4f]' : isTransfer ? 'bg-[#ff4f99]' : 'bg-[#1c1c21]'
        }`}
      />
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className={`font-bold text-base ${isTransfer ? 'text-[#ff4f99]' : 'text-white'}`}>{expense.title}</h4>
            {isTransfer && (
              <span className="text-[9px] bg-[#ff4f99]/20 text-[#ff4f99] px-1.5 rounded border border-[#ff4f99]/30">
                TRANSFER
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {isPayer ? 'You paid ' : `${payer.name} paid `}
            <span className="text-white font-bold">
              {expense.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </span>
          </p>
        </div>
        <div className="text-right">
          {isPayer && (
            <button
              onClick={() => onDelete(expense.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-white/5 rounded-full"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {!isPayer && myShare > 0 && !isTransfer && (
        <div className="inline-block px-2 py-1 rounded bg-[#ff4f99]/10 border border-[#ff4f99]/20">
          <p className="text-[10px] text-[#ff4f99] font-mono font-bold">
            YOU OWE {myShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </p>
        </div>
      )}
      {isTransfer && !isPayer && myShare > 0 && (
        <div className="inline-block px-2 py-1 rounded bg-[#dfff4f]/10 border border-[#dfff4f]/20">
          <p className="text-[10px] text-[#dfff4f] font-mono font-bold">
            RECEIVED {myShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </p>
        </div>
      )}
      {isPayer && !isTransfer && (
        <div className="flex -space-x-2 mt-2 pl-1">
          {Object.keys(expense.splits).map((uid) => {
            const u = activeUsers.find((usr) => usr.id === uid)
            if (!u) return null
            return (
              <div
                key={uid}
                className={`w-5 h-5 rounded-full border border-[#0a0a0c] ${u.color} flex items-center justify-center text-[8px] text-black font-bold`}
                title={u.name}
              >
                {u.avatar}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

