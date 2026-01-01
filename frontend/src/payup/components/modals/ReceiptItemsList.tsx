/**
 * Receipt Items List Component
 * Displays and allows editing of parsed receipt items
 */

import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import type { ParsedItem } from '../../utils/receiptParser'

interface Props {
    items: ParsedItem[]
    vat?: number
    serviceCharge?: number
    discount?: number
    total: number
    merchant?: string
    onItemsChange: (items: ParsedItem[]) => void
    onContinue: () => void
    onBack: () => void
}

export function ReceiptItemsList({
    items,
    vat,
    serviceCharge,
    discount,
    total,
    merchant,
    onItemsChange,
    onContinue,
    onBack,
}: Props) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editPrice, setEditPrice] = useState('')
    const [showAddItem, setShowAddItem] = useState(false)
    const [newItemName, setNewItemName] = useState('')
    const [newItemPrice, setNewItemPrice] = useState('')

    const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
    const difference = Math.abs(total - calculatedTotal - (vat || 0) - (serviceCharge || 0) + (discount || 0))

    const startEdit = (item: ParsedItem) => {
        setEditingId(item.id)
        setEditName(item.name)
        setEditPrice(String(item.totalPrice))
    }

    const saveEdit = () => {
        if (!editingId) return

        const updatedItems = items.map((item) =>
            item.id === editingId
                ? {
                    ...item,
                    name: editName.trim() || item.name,
                    totalPrice: parseFloat(editPrice) || item.totalPrice,
                    unitPrice: parseFloat(editPrice) || item.totalPrice,
                    quantity: 1,
                }
                : item
        )
        onItemsChange(updatedItems)
        setEditingId(null)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditPrice('')
    }

    const deleteItem = (id: string) => {
        onItemsChange(items.filter((item) => item.id !== id))
    }

    const addItem = () => {
        if (!newItemName.trim() || !newItemPrice) return

        const newItem: ParsedItem = {
            id: crypto.randomUUID(),
            name: newItemName.trim(),
            quantity: 1,
            unitPrice: parseFloat(newItemPrice),
            totalPrice: parseFloat(newItemPrice),
        }

        onItemsChange([...items, newItem])
        setNewItemName('')
        setNewItemPrice('')
        setShowAddItem(false)
    }

    const formatCurrency = (amount: number) =>
        amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-[#1c1c21]">
                <h3 className="font-display text-lg font-bold text-white">Review Items</h3>
                {merchant && <p className="text-gray-400 text-sm">{merchant}</p>}
                <p className="text-gray-500 text-xs mt-1">Tap an item to edit if needed</p>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {items.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No items detected</p>
                        <button
                            onClick={() => setShowAddItem(true)}
                            className="px-4 py-2 bg-[#dfff4f]/10 text-[#dfff4f] rounded-lg text-sm font-medium"
                        >
                            Add items manually
                        </button>
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all ${editingId === item.id
                                    ? 'bg-[#dfff4f]/10 border-[#dfff4f]'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                        >
                            {editingId === item.id ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#dfff4f]"
                                        placeholder="Item name"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                            <input
                                                type="number"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(e.target.value)}
                                                className="w-full bg-black/30 border border-white/20 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#dfff4f]"
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                        <button
                                            onClick={saveEdit}
                                            className="p-2 bg-[#dfff4f] text-black rounded-lg hover:bg-[#ccee3e]"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                        {item.quantity > 1 && (
                                            <p className="text-gray-500 text-xs">x{item.quantity}</p>
                                        )}
                                    </div>
                                    <span className="text-[#dfff4f] font-mono font-bold text-sm whitespace-nowrap">
                                        {formatCurrency(item.totalPrice)}
                                    </span>
                                    <button
                                        onClick={() => startEdit(item)}
                                        className="p-1.5 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteItem(item.id)}
                                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Add Item Form */}
                {showAddItem && (
                    <div className="p-3 rounded-xl border border-[#dfff4f] bg-[#dfff4f]/10 space-y-2">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#dfff4f]"
                            placeholder="Item name"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                <input
                                    type="number"
                                    value={newItemPrice}
                                    onChange={(e) => setNewItemPrice(e.target.value)}
                                    className="w-full bg-black/30 border border-white/20 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#dfff4f]"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                            <button
                                onClick={addItem}
                                disabled={!newItemName.trim() || !newItemPrice}
                                className="p-2 bg-[#dfff4f] text-black rounded-lg hover:bg-[#ccee3e] disabled:opacity-50"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddItem(false)
                                    setNewItemName('')
                                    setNewItemPrice('')
                                }}
                                className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Item Button */}
                {!showAddItem && items.length > 0 && (
                    <button
                        onClick={() => setShowAddItem(true)}
                        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:border-[#dfff4f] hover:text-[#dfff4f] transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        <span className="text-sm font-medium">Add Item</span>
                    </button>
                )}

                {/* Summary Section */}
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Items Total</span>
                        <span className="text-white font-mono">{formatCurrency(calculatedTotal)}</span>
                    </div>
                    {vat !== undefined && vat > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">VAT (12%)</span>
                            <span className="text-white font-mono">{formatCurrency(vat)}</span>
                        </div>
                    )}
                    {serviceCharge !== undefined && serviceCharge > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Service Charge</span>
                            <span className="text-white font-mono">{formatCurrency(serviceCharge)}</span>
                        </div>
                    )}
                    {discount !== undefined && discount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Discount</span>
                            <span className="text-green-400 font-mono">-{formatCurrency(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                        <span className="text-white">Total</span>
                        <span className="text-[#dfff4f] font-mono">{formatCurrency(total)}</span>
                    </div>
                    {difference > 1 && (
                        <p className="text-yellow-500 text-xs mt-2">
                            ⚠️ Items total differs from receipt total by {formatCurrency(difference)}
                        </p>
                    )}
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
                    onClick={onContinue}
                    disabled={items.length === 0}
                    className="flex-1 py-3 bg-[#dfff4f] text-black font-bold rounded-xl hover:bg-[#ccee3e] transition-colors disabled:opacity-50"
                >
                    ASSIGN ITEMS
                </button>
            </div>
        </div>
    )
}
