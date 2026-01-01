/**
 * Item Assignment Component
 * Per-item user assignment for receipt splitting
 */

import { Check, Share2, User } from 'lucide-react'

import type { User as UserType } from '../../types'
import type { ParsedItem } from '../../utils/receiptParser'

interface Props {
    items: ParsedItem[]
    users: UserType[]
    currentUserId: string
    vat?: number
    serviceCharge?: number
    onItemsChange: (items: ParsedItem[]) => void
    onConfirm: () => void
    onBack: () => void
}

export function ItemAssignment({
    items,
    users,
    currentUserId,
    vat,
    serviceCharge,
    onItemsChange,
    onConfirm,
    onBack,
}: Props) {
    const assignItem = (itemId: string, userId: string | 'shared') => {
        const updatedItems = items.map((item) =>
            item.id === itemId ? { ...item, assignedTo: userId } : item
        )
        onItemsChange(updatedItems)
    }

    const assignAllToMe = () => {
        const updatedItems = items.map((item) => ({
            ...item,
            assignedTo: currentUserId,
        }))
        onItemsChange(updatedItems)
    }

    const splitAllEvenly = () => {
        const updatedItems = items.map((item) => ({
            ...item,
            assignedTo: 'shared',
        }))
        onItemsChange(updatedItems)
    }

    // Calculate per-person totals
    const userTotals: Record<string, number> = {}
    let sharedTotal = 0

    for (const item of items) {
        if (item.assignedTo === 'shared' || !item.assignedTo) {
            sharedTotal += item.totalPrice
        } else {
            userTotals[item.assignedTo] = (userTotals[item.assignedTo] || 0) + item.totalPrice
        }
    }

    // Add VAT and service charge to shared
    if (vat) sharedTotal += vat
    if (serviceCharge) sharedTotal += serviceCharge

    // Calculate final splits (shared divided among all users with assigned items)
    const usersWithItems = new Set<string>()
    for (const item of items) {
        if (item.assignedTo && item.assignedTo !== 'shared') {
            usersWithItems.add(item.assignedTo)
        }
    }
    // If some items are shared, all users should be included
    const usersToSplit = sharedTotal > 0 ? users.map((u) => u.id) : Array.from(usersWithItems)

    const sharedPerPerson = usersToSplit.length > 0 ? sharedTotal / usersToSplit.length : 0

    const finalSplits: Record<string, number> = {}
    for (const userId of usersToSplit) {
        finalSplits[userId] = (userTotals[userId] || 0) + sharedPerPerson
    }

    const grandTotal = Object.values(finalSplits).reduce((sum, val) => sum + val, 0)

    const formatCurrency = (amount: number) =>
        amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

    // Check if all items are assigned
    const allAssigned = items.every((item) => item.assignedTo)

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-[#1c1c21]">
                <h3 className="font-display text-lg font-bold text-white">Assign Items</h3>
                <p className="text-gray-500 text-xs mt-1">Tap to assign each item to a person</p>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-white/5 flex gap-2">
                <button
                    onClick={assignAllToMe}
                    className="flex-1 py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:border-[#dfff4f] hover:text-[#dfff4f] transition-colors flex items-center justify-center gap-1"
                >
                    <User size={14} />
                    All Mine
                </button>
                <button
                    onClick={splitAllEvenly}
                    className="flex-1 py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:border-[#dfff4f] hover:text-[#dfff4f] transition-colors flex items-center justify-center gap-1"
                >
                    <Share2 size={14} />
                    Split All
                </button>
            </div>

            {/* Items with Assignment */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="space-y-2">
                        {/* Item Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                            </div>
                            <span className="text-[#dfff4f] font-mono font-bold text-sm ml-2">
                                {formatCurrency(item.totalPrice)}
                            </span>
                        </div>

                        {/* User Selection */}
                        <div className="flex gap-2 flex-wrap">
                            {users.map((user) => {
                                const isSelected = item.assignedTo === user.id
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => assignItem(item.id, user.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${isSelected
                                            ? 'bg-[#dfff4f] border-[#dfff4f] text-black'
                                            : 'bg-white/5 border-white/20 text-gray-400 hover:border-white/40'
                                            }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full ${user.color} flex items-center justify-center text-[10px] font-bold text-black`}
                                        >
                                            {user.avatar}
                                        </div>
                                        <span>{user.name}</span>
                                        {user.id === currentUserId && (
                                            <span className="opacity-60 text-[10px]">(You)</span>
                                        )}
                                        {isSelected && <Check size={14} />}
                                    </button>
                                )
                            })}

                            {/* Shared Option */}
                            <button
                                onClick={() => assignItem(item.id, 'shared')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${item.assignedTo === 'shared'
                                    ? 'bg-blue-500 border-blue-500 text-white'
                                    : 'bg-white/5 border-white/20 text-gray-400 hover:border-white/40'
                                    }`}
                            >
                                <Share2 size={14} />
                                <span>Shared</span>
                                {item.assignedTo === 'shared' && <Check size={14} />}
                            </button>
                        </div>
                    </div>
                ))}

                {/* Additional Charges */}
                {(vat || serviceCharge) && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        <p className="text-gray-500 text-xs uppercase font-bold">Additional Charges (Shared)</p>
                        {vat && vat > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">VAT (12%)</span>
                                <span className="text-blue-400 font-mono text-sm flex items-center gap-1">
                                    <Share2 size={12} />
                                    {formatCurrency(vat)}
                                </span>
                            </div>
                        )}
                        {serviceCharge && serviceCharge > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Service Charge</span>
                                <span className="text-blue-400 font-mono text-sm flex items-center gap-1">
                                    <Share2 size={12} />
                                    {formatCurrency(serviceCharge)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Per-Person Summary */}
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <p className="text-gray-500 text-xs uppercase font-bold">Split Summary</p>
                    {users.map((user) => {
                        const amount = finalSplits[user.id] || 0
                        if (amount === 0) return null

                        const personal = userTotals[user.id] || 0
                        const shared = sharedPerPerson

                        return (
                            <div key={user.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                <div
                                    className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-xs font-bold text-black`}
                                >
                                    {user.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium">{user.name}</p>
                                    <p className="text-gray-500 text-xs">
                                        {personal > 0 && <span>Items: {formatCurrency(personal)}</span>}
                                        {personal > 0 && shared > 0 && <span> + </span>}
                                        {shared > 0 && <span>Shared: {formatCurrency(shared)}</span>}
                                    </p>
                                </div>
                                <span className="text-[#dfff4f] font-mono font-bold">
                                    {formatCurrency(amount)}
                                </span>
                            </div>
                        )
                    })}

                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-white font-bold">Grand Total</span>
                        <span className="text-[#dfff4f] font-mono font-bold text-lg">
                            {formatCurrency(grandTotal)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-[#1c1c21] flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
                >
                    BACK
                </button>
                <button
                    onClick={onConfirm}
                    disabled={!allAssigned}
                    className="flex-1 py-3 bg-[#dfff4f] text-black font-bold rounded-xl hover:bg-[#ccee3e] transition-colors disabled:opacity-50"
                >
                    CONFIRM
                </button>
            </div>

            {!allAssigned && (
                <p className="text-center text-yellow-500 text-xs pb-2 bg-[#1c1c21]">
                    Assign all items to continue
                </p>
            )}
        </div>
    )
}
