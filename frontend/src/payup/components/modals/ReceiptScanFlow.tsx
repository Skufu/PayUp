/**
 * Receipt Scan Flow Component
 * Orchestrates the entire receipt scanning workflow:
 * 1. Scan receipt → 2. Review items → 3. Assign to users → 4. Create expense
 */

import { Camera, X } from 'lucide-react'
import { useState } from 'react'

import type { User } from '../../types'
import type { ParsedItem, ParsedReceipt } from '../../utils/receiptParser'
import { calculateSplits } from '../../utils/receiptParser'
import { ItemAssignment } from './ItemAssignment'
import { ReceiptItemsList } from './ReceiptItemsList'
import { ReceiptScanner } from './ReceiptScanner'

type FlowStep = 'scan' | 'review' | 'assign'

interface Props {
    isOpen: boolean
    onClose: () => void
    currentUser: User
    activeUsers: User[]
    onComplete: (expense: {
        title: string
        amount: number
        payerId: string
        mode: string
        type: 'expense'
        category: string
        splits: Record<string, number>
    }) => void
}

export function ReceiptScanFlow({
    isOpen,
    onClose,
    currentUser,
    activeUsers,
    onComplete,
}: Props) {
    const [step, setStep] = useState<FlowStep>('scan')
    const [receipt, setReceipt] = useState<ParsedReceipt | null>(null)
    const [items, setItems] = useState<ParsedItem[]>([])

    const handleScanComplete = (parsedReceipt: ParsedReceipt) => {
        setReceipt(parsedReceipt)
        setItems(parsedReceipt.items)
        setStep('review')
    }

    const handleItemsChange = (newItems: ParsedItem[]) => {
        setItems(newItems)
    }

    const handleReviewComplete = () => {
        setStep('assign')
    }

    const handleAssignmentComplete = () => {
        if (!receipt) return

        // Calculate final splits
        const splits = calculateSplits(
            items,
            receipt.vat,
            receipt.serviceCharge,
            activeUsers.map((u) => u.id)
        )

        // Calculate total
        const total = Object.values(splits).reduce((sum, val) => sum + val, 0)

        // Generate expense title
        let title = receipt.merchant || 'Receipt'
        if (items.length > 0) {
            const itemNames = items.slice(0, 2).map((i) => i.name).join(', ')
            if (items.length > 2) {
                title = `${itemNames} +${items.length - 2} more`
            } else {
                title = itemNames
            }
        }

        // Submit expense
        onComplete({
            title,
            amount: total,
            payerId: currentUser.id,
            mode: 'itemized',
            type: 'expense',
            category: 'Food', // Default to Food for receipts
            splits,
        })

        // Reset state
        handleClose()
    }

    const handleClose = () => {
        setStep('scan')
        setReceipt(null)
        setItems([])
        onClose()
    }

    const handleBack = () => {
        if (step === 'review') {
            setStep('scan')
        } else if (step === 'assign') {
            setStep('review')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-lg bg-[#131316] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                {/* Only show custom header for review and assign steps */}
                {step !== 'scan' && (
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
                        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                            <Camera className="text-[#dfff4f]" size={20} />
                            {step === 'review' ? 'Review Items' : 'Assign Items'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Scanner Step */}
                {step === 'scan' && (
                    <ReceiptScanner
                        isOpen={true}
                        onClose={handleClose}
                        onScanComplete={handleScanComplete}
                    />
                )}

                {/* Review Step */}
                {step === 'review' && receipt && (
                    <ReceiptItemsList
                        items={items}
                        vat={receipt.vat}
                        serviceCharge={receipt.serviceCharge}
                        discount={receipt.discount}
                        total={receipt.total}
                        merchant={receipt.merchant}
                        onItemsChange={handleItemsChange}
                        onContinue={handleReviewComplete}
                        onBack={handleBack}
                    />
                )}

                {/* Assign Step */}
                {step === 'assign' && receipt && (
                    <ItemAssignment
                        items={items}
                        users={activeUsers}
                        currentUserId={currentUser.id}
                        vat={receipt.vat}
                        serviceCharge={receipt.serviceCharge}
                        onItemsChange={handleItemsChange}
                        onConfirm={handleAssignmentComplete}
                        onBack={handleBack}
                    />
                )}
            </div>
        </div>
    )
}
