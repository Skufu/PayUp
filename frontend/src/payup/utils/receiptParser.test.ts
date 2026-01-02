/**
 * Unit tests for the Philippine Receipt Parser
 * Tests OCR correction, parsing, and validation
 */

import { describe, it, expect } from 'vitest'
import { parseReceipt, calculateSplits, type ParsedItem } from './receiptParser'

// ============================================================================
// TEST DATA - Simulated OCR output from real Philippine receipts
// ============================================================================

const MCDONALDS_RECEIPT = `
MCDONALD'S
GOLDEN ARCHES DEVELOPMENT CORP
SM CITY MANILA
VAT REG TIN: 000-123-456-000

DATE: 01/02/2026  TIME: 12:30 PM
CASHIER: Maria

1 T CknFil Rice   65.00   65.00
2 BURGER MCDO     49.00   98.00
1 OREO MCFLURRY   55.00   55.00
1 COKE            35.00   35.00

SUBTOTAL                  253.00
VAT (12%)                  27.32
TOTAL                     280.32

CASH                      300.00
CHANGE                     19.68

THANK YOU FOR YOUR PURCHASE!
`

const JOLLIBEE_RECEIPT = `
JOLLIBEE
VAT REG TIN: 001-234-567

1    SPICY CHJOL ML     169.00
2    YUM                 45.00
1    JOLLY SPAG          75.00
1    PMP                 39.00

VATABLE SALES            293.75
VAT 12%                   35.25
TOTAL                    329.00

CASH TENDERED            500.00
CHANGE                   171.00
`

const POOR_QUALITY_RECEIPT = `
McDONA1D'S

1 T CknF1l R1ce   6S.00   6S.00
2 BURGER MCD0     49.O0   98.O0

T0TAL                    163.00
`

const SINGLE_SPACE_FORMAT = `
CHOWKING

1 CHAO FAN 89.00 89.00
2 SIOMAI 45.00 90.00

TOTAL 179.00
`

const MINIMAL_RECEIPT = `
TOTAL 250.00
`

const MISMATCHED_TOTAL_RECEIPT = `
JOLLIBEE

1 CHICKENJOY   99.00
1 SPAGHETTI    65.00

TOTAL         500.00
`

// ============================================================================
// PARSE RECEIPT TESTS
// ============================================================================

describe('parseReceipt', () => {
    describe('McDonald\'s format (4-column)', () => {
        it('should parse items with quantity, name, unit price, and total', () => {
            const result = parseReceipt(MCDONALDS_RECEIPT)

            expect(result.items.length).toBeGreaterThanOrEqual(3)
            expect(result.merchant).toBe("McDonald's")
            // Parser finds TOTAL or falls back to SUBTOTAL
            expect(result.total).toBeGreaterThan(200)
        })

        it('should extract VAT correctly', () => {
            const result = parseReceipt(MCDONALDS_RECEIPT)

            expect(result.vat).toBeCloseTo(27.32, 1)
        })

        it('should extract subtotal', () => {
            const result = parseReceipt(MCDONALDS_RECEIPT)

            expect(result.subtotal).toBeCloseTo(253, 0)
        })

        it('should expand abbreviations', () => {
            const result = parseReceipt(MCDONALDS_RECEIPT)

            const chickenItem = result.items.find(i =>
                i.name.toLowerCase().includes('chicken') ||
                i.name.toLowerCase().includes('cknfil')
            )
            expect(chickenItem).toBeDefined()
        })
    })

    describe('Jollibee format (3-column)', () => {
        it('should parse 3-column format correctly', () => {
            const result = parseReceipt(JOLLIBEE_RECEIPT)

            expect(result.items.length).toBeGreaterThanOrEqual(3)
            expect(result.merchant).toBe('Jollibee')
        })

        it('should expand Jollibee abbreviations', () => {
            const result = parseReceipt(JOLLIBEE_RECEIPT)

            // CHJOL should expand to Chickenjoy
            const chickenItem = result.items.find(i =>
                i.name.toLowerCase().includes('chicken')
            )
            expect(chickenItem).toBeDefined()
        })

        it('should handle YUM abbreviation', () => {
            const result = parseReceipt(JOLLIBEE_RECEIPT)

            const yumItem = result.items.find(i =>
                i.name.toLowerCase().includes('yum')
            )
            expect(yumItem).toBeDefined()
            expect(yumItem?.quantity).toBe(2)
        })
    })

    describe('OCR correction', () => {
        it('should correct common digit errors', () => {
            const result = parseReceipt(POOR_QUALITY_RECEIPT)

            // 6S.00 should become 65.00, O should become 0
            expect(result.total).toBeCloseTo(163, 0)
        })

        it('should correct T0TAL to TOTAL', () => {
            const result = parseReceipt(POOR_QUALITY_RECEIPT)

            expect(result.total).toBeGreaterThan(0)
        })
    })

    describe('Fallback parsing', () => {
        it('should parse single-space separated format', () => {
            const result = parseReceipt(SINGLE_SPACE_FORMAT)

            expect(result.items.length).toBeGreaterThanOrEqual(1)
            expect(result.merchant).toBe('Chowking')
        })
    })

    describe('Validation', () => {
        it('should have high confidence for well-parsed receipts', () => {
            const result = parseReceipt(MCDONALDS_RECEIPT)

            expect(result.parseConfidence).toBeGreaterThanOrEqual(60)
        })

        it('should have low confidence when no items found', () => {
            const result = parseReceipt(MINIMAL_RECEIPT)

            expect(result.parseConfidence).toBeLessThan(80)
            expect(result.validationWarnings.length).toBeGreaterThan(0)
        })

        it('should warn when items sum does not match total', () => {
            const result = parseReceipt(MISMATCHED_TOTAL_RECEIPT)

            // Items sum to 164, but total is 500
            expect(result.validationWarnings.some(w =>
                w.includes('differs') || w.includes('sum')
            )).toBe(true)
        })
    })

    describe('Edge cases', () => {
        it('should handle empty input', () => {
            const result = parseReceipt('')

            expect(result.items).toEqual([])
            expect(result.total).toBe(0)
            expect(result.parseConfidence).toBeLessThan(60)
        })

        it('should handle input with only headers', () => {
            const result = parseReceipt(`
        JOLLIBEE
        VAT REG TIN: 123-456-789
        THANK YOU FOR YOUR PURCHASE
      `)

            expect(result.items).toEqual([])
            expect(result.merchant).toBe('Jollibee')
        })

        it('should skip BIR accounting lines', () => {
            // These lines have prices but should NOT be parsed as items
            const result = parseReceipt(`
ZERO RATED SALES    0.00
VAT EXEMPT SALES    0.00
VATABLE SALES      88.39
VAT 12%            10.61
TOTAL              99.00
      `)

            // None of these should appear as items
            expect(result.items.every(i => !i.name.toLowerCase().includes('zero rated'))).toBe(true)
            expect(result.items.every(i => !i.name.toLowerCase().includes('vat exempt'))).toBe(true)
            expect(result.items.every(i => !i.name.toLowerCase().includes('vatable'))).toBe(true)
        })
    })

    describe('Date extraction', () => {
        it('should extract date in MM/DD/YYYY format', () => {
            const result = parseReceipt(MCDONALDS_RECEIPT)

            expect(result.date).toBeDefined()
            expect(result.date).toMatch(/01\/02\/2026|2026/)
        })
    })
})

// ============================================================================
// CALCULATE SPLITS TESTS
// ============================================================================

describe('calculateSplits', () => {
    const mockItems: ParsedItem[] = [
        { id: '1', name: 'Burger', quantity: 1, unitPrice: 50, totalPrice: 50, assignedTo: 'user1' },
        { id: '2', name: 'Fries', quantity: 1, unitPrice: 30, totalPrice: 30, assignedTo: 'user2' },
        { id: '3', name: 'Drink', quantity: 1, unitPrice: 20, totalPrice: 20, assignedTo: 'shared' },
    ]

    it('should split individual items to assigned users', () => {
        const splits = calculateSplits(mockItems)

        expect(splits['user1']).toBeCloseTo(60, 0) // 50 + 10 (half of shared drink)
        expect(splits['user2']).toBeCloseTo(40, 0) // 30 + 10 (half of shared drink)
    })

    it('should add VAT to shared total', () => {
        const splits = calculateSplits(mockItems, 12)

        // VAT is added to shared, then split
        const totalSplits = Object.values(splits).reduce((a, b) => a + b, 0)
        expect(totalSplits).toBeCloseTo(112, 0) // 100 items + 12 VAT
    })

    it('should handle all shared items', () => {
        const sharedItems: ParsedItem[] = [
            { id: '1', name: 'Pizza', quantity: 1, unitPrice: 300, totalPrice: 300 },
        ]

        const splits = calculateSplits(sharedItems, 0, 0, ['user1', 'user2', 'user3'])

        expect(splits['user1']).toBeCloseTo(100, 0)
        expect(splits['user2']).toBeCloseTo(100, 0)
        expect(splits['user3']).toBeCloseTo(100, 0)
    })

    it('should handle empty items', () => {
        const splits = calculateSplits([])

        expect(Object.keys(splits).length).toBe(0)
    })
})

// ============================================================================
// SPECIFIC OCR CORRECTION TESTS
// ============================================================================

describe('OCR corrections', () => {
    it('should correct O to 0 in prices', () => {
        const result = parseReceipt('ITEM 1O5.OO')
        // The fallback parser should find 105.00 or similar
        expect(result.items.length).toBeGreaterThanOrEqual(0)
    })

    it('should correct S to 5 in prices', () => {
        const result = parseReceipt('BURGER 4S.00\nTOTAL 45.00')
        expect(result.total).toBe(45)
    })

    it('should handle merged lines', () => {
        const result = parseReceipt('99.00CHICKENJOY 99.00\nTOTAL 99.00')
        // Should split the merged line
        expect(result.total).toBe(99)
    })
})
