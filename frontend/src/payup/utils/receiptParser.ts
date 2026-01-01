/**
 * Philippine receipt parser
 * Extracts line items, prices, VAT, and totals from OCR text
 */

export interface ParsedItem {
    id: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    assignedTo?: string // User ID or 'shared'
}

export interface ParsedReceipt {
    items: ParsedItem[]
    subtotal?: number
    vat?: number
    vatRate?: number
    serviceCharge?: number
    discount?: number
    total: number
    merchant?: string
    date?: string
    rawText: string
}

// Philippine currency patterns
const CURRENCY_PATTERNS = [
    /₱\s*([\d,]+\.?\d*)/g,
    /PHP\s*([\d,]+\.?\d*)/gi,
    /P\s*([\d,]+\.?\d*)/g,
    /([\d,]+\.?\d*)\s*(?:PESOS?|pesos?)/gi,
]

// VAT patterns
const VAT_PATTERNS = [
    /VAT(?:able)?\s*(?:12%?)?\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
    /12%\s*VAT\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
    /VAT\s*\(?12%?\)?\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
]

// Total patterns (order matters - more specific first)
const TOTAL_PATTERNS = [
    /GRAND\s*TOTAL\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
    /AMOUNT\s*DUE\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
    /TOTAL\s*(?:AMOUNT|DUE)?\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
    /(?:^|\s)TOTAL\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/im,
]

// Subtotal patterns
const SUBTOTAL_PATTERNS = [
    /SUB\s*[-]?\s*TOTAL\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
    /NET\s*(?:AMOUNT|SALES?)?\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
]

// Service charge patterns
const SERVICE_PATTERNS = [
    /(?:SERVICE|SVC)\s*(?:CHARGE|CHG)?\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
]

// Discount patterns
const DISCOUNT_PATTERNS = [
    /(?:DISCOUNT|DISC|SC\/PWD)\s*[:=]?\s*-?\s*₱?\s*([\d,]+\.?\d*)/i,
    /LESS\s*[:=]?\s*₱?\s*([\d,]+\.?\d*)/i,
]

// Common Philippine store names
const STORE_PATTERNS = [
    { pattern: /SM\s*(?:SUPERMARKET|HYPERMARKET|STORE)/i, name: 'SM' },
    { pattern: /JOLLIBEE/i, name: 'Jollibee' },
    { pattern: /MCDONALD'?S/i, name: "McDonald's" },
    { pattern: /7[-\s]?ELEVEN/i, name: '7-Eleven' },
    { pattern: /MERCURY\s*DRUG/i, name: 'Mercury Drug' },
    { pattern: /PUREGOLD/i, name: 'Puregold' },
    { pattern: /ROBINSONS?\s*(?:SUPERMARKET)?/i, name: 'Robinsons' },
    { pattern: /MINISTOP/i, name: 'Ministop' },
    { pattern: /ALFAMART/i, name: 'Alfamart' },
    { pattern: /WATSONS/i, name: 'Watsons' },
    { pattern: /NATIONAL\s*BOOK\s*STORE/i, name: 'National Bookstore' },
    { pattern: /GREENWICH/i, name: 'Greenwich' },
    { pattern: /CHOWKING/i, name: 'Chowking' },
    { pattern: /KFC/i, name: 'KFC' },
    { pattern: /STARBUCKS/i, name: 'Starbucks' },
]

// Lines to skip (headers, footers, etc.)
const SKIP_PATTERNS = [
    /^[-=_*]+$/,
    /^THANK\s*YOU/i,
    /^PLEASE\s*COME/i,
    /^OFFICIAL\s*RECEIPT/i,
    /^VAT\s*REG\s*TIN/i,
    /^TIN\s*:/i,
    /^SI\s*#/i,
    /^OR\s*#/i,
    /^DATE\s*:/i,
    /^TIME\s*:/i,
    /^CASHIER/i,
    /^TERMINAL/i,
    /^STORE\s*#/i,
    /^BRANCH/i,
    /^\*{3,}/,
    /^-{3,}$/,
    /^={3,}$/,
]

/**
 * Extract price from a string
 */
function extractPrice(text: string): number | null {
    for (const pattern of CURRENCY_PATTERNS) {
        pattern.lastIndex = 0 // Reset regex
        const match = pattern.exec(text)
        if (match) {
            return parseFloat(match[1].replace(/,/g, ''))
        }
    }

    // Fallback: look for any decimal number at end of line
    const decimalMatch = text.match(/([\d,]+\.\d{2})\s*$/)
    if (decimalMatch) {
        return parseFloat(decimalMatch[1].replace(/,/g, ''))
    }

    return null
}

/**
 * Extract quantity from item line (e.g., "2x Burger" or "Burger x2")
 */
function extractQuantity(text: string): { quantity: number; cleanedText: string } {
    // Pattern: "2x Item" or "2 x Item"
    let match = text.match(/^(\d+)\s*[xX]\s+(.+)/)
    if (match) {
        return { quantity: parseInt(match[1]), cleanedText: match[2] }
    }

    // Pattern: "Item x2" or "Item x 2"
    match = text.match(/(.+?)\s*[xX]\s*(\d+)\s*$/)
    if (match) {
        return { quantity: parseInt(match[2]), cleanedText: match[1] }
    }

    // Pattern: "2 Item" (number at start)
    match = text.match(/^(\d+)\s+([A-Za-z].+)/)
    if (match && parseInt(match[1]) <= 20) {
        return { quantity: parseInt(match[1]), cleanedText: match[2] }
    }

    return { quantity: 1, cleanedText: text }
}

/**
 * Check if line should be skipped
 */
function shouldSkipLine(line: string): boolean {
    const trimmed = line.trim()
    if (trimmed.length < 3) return true

    for (const pattern of SKIP_PATTERNS) {
        if (pattern.test(trimmed)) return true
    }

    // Skip if it's a total/subtotal/vat line
    if (
        /^(?:TOTAL|SUB\s*TOTAL|VAT|CHANGE|CASH|TENDER|AMOUNT)/i.test(trimmed)
    ) {
        return true
    }

    return false
}

/**
 * Parse a single item line
 */
function parseItemLine(line: string): ParsedItem | null {
    const trimmed = line.trim()

    // Extract price first
    const price = extractPrice(trimmed)
    if (price === null || price <= 0) return null

    // Remove price from line to get item name
    let itemText = trimmed
    for (const pattern of CURRENCY_PATTERNS) {
        itemText = itemText.replace(pattern, '')
    }
    itemText = itemText.replace(/([\d,]+\.\d{2})\s*$/, '').trim()

    // Extract quantity
    const { quantity, cleanedText } = extractQuantity(itemText)

    // Clean up item name
    let name = cleanedText
        .replace(/^[-*•]\s*/, '') // Remove bullet points
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

    if (name.length < 2) return null

    // Capitalize first letter of each word
    name = name
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())

    const unitPrice = price / quantity

    return {
        id: crypto.randomUUID(),
        name,
        quantity,
        unitPrice: Math.round(unitPrice * 100) / 100,
        totalPrice: price,
    }
}

/**
 * Extract merchant name from receipt text
 */
function extractMerchant(lines: string[]): string | undefined {
    // Check first 5 lines for store patterns
    const headerLines = lines.slice(0, 5).join(' ')

    for (const store of STORE_PATTERNS) {
        if (store.pattern.test(headerLines)) {
            return store.name
        }
    }

    return undefined
}

/**
 * Extract date from receipt text
 */
function extractDate(lines: string[]): string | undefined {
    const datePatterns = [
        /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
        /(\d{4}[/-]\d{1,2}[/-]\d{1,2})/,
        /((?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{1,2},?\s+\d{4})/i,
    ]

    for (const line of lines.slice(0, 10)) {
        for (const pattern of datePatterns) {
            const match = line.match(pattern)
            if (match) return match[1]
        }
    }

    return undefined
}

/**
 * Apply common OCR corrections for Philippine receipts
 */
function correctOCRMistakes(text: string): string {
    return text
        // Common letter/number confusions
        .replace(/[O0](\.\d{2})/g, '0$1') // O.00 -> 0.00
        .replace(/(\d)[lI]/g, '$11') // 1l -> 11
        .replace(/[lI](\d)/g, '1$1') // l9 -> 19
        .replace(/[S5](\.\d{2})/g, '5$1') // S.00 -> 5.00
        // Fix peso symbol
        .replace(/[Pp]\s*(\d)/g, '₱$1')
        // Fix common words
        .replace(/T0TAL/gi, 'TOTAL')
        .replace(/SUBT0TAL/gi, 'SUBTOTAL')
        .replace(/CHANGER/gi, 'CHANGE')
}

/**
 * Parse OCR text into structured receipt data
 */
export function parseReceipt(ocrText: string): ParsedReceipt {
    // Apply OCR corrections
    const correctedText = correctOCRMistakes(ocrText)
    const lines = correctedText.split('\n').map((l) => l.trim()).filter(Boolean)

    const items: ParsedItem[] = []
    let subtotal: number | undefined
    let vat: number | undefined
    let serviceCharge: number | undefined
    let discount: number | undefined
    let total = 0

    // Extract metadata
    const merchant = extractMerchant(lines)
    const date = extractDate(lines)

    // Extract total first (to avoid counting it as an item)
    for (const pattern of TOTAL_PATTERNS) {
        for (const line of lines) {
            const match = line.match(pattern)
            if (match) {
                total = parseFloat(match[1].replace(/,/g, ''))
                break
            }
        }
        if (total > 0) break
    }

    // Extract subtotal
    for (const pattern of SUBTOTAL_PATTERNS) {
        for (const line of lines) {
            const match = line.match(pattern)
            if (match) {
                subtotal = parseFloat(match[1].replace(/,/g, ''))
                break
            }
        }
        if (subtotal) break
    }

    // Extract VAT
    for (const pattern of VAT_PATTERNS) {
        for (const line of lines) {
            const match = line.match(pattern)
            if (match) {
                vat = parseFloat(match[1].replace(/,/g, ''))
                break
            }
        }
        if (vat) break
    }

    // Extract service charge
    for (const pattern of SERVICE_PATTERNS) {
        for (const line of lines) {
            const match = line.match(pattern)
            if (match) {
                serviceCharge = parseFloat(match[1].replace(/,/g, ''))
                break
            }
        }
        if (serviceCharge) break
    }

    // Extract discount
    for (const pattern of DISCOUNT_PATTERNS) {
        for (const line of lines) {
            const match = line.match(pattern)
            if (match) {
                discount = parseFloat(match[1].replace(/,/g, ''))
                break
            }
        }
        if (discount) break
    }

    // Parse line items
    for (const line of lines) {
        if (shouldSkipLine(line)) continue

        const item = parseItemLine(line)
        if (item) {
            // Skip if this looks like the total or subtotal
            if (Math.abs(item.totalPrice - total) < 0.01) continue
            if (subtotal && Math.abs(item.totalPrice - subtotal) < 0.01) continue

            items.push(item)
        }
    }

    // If no total found, sum up items
    if (total === 0 && items.length > 0) {
        total = items.reduce((sum, item) => sum + item.totalPrice, 0)
        if (vat) total += vat
        if (serviceCharge) total += serviceCharge
        if (discount) total -= discount
    }

    return {
        items,
        subtotal,
        vat,
        vatRate: vat && subtotal ? Math.round((vat / subtotal) * 100) : 12,
        serviceCharge,
        discount,
        total: Math.round(total * 100) / 100,
        merchant,
        date,
        rawText: ocrText,
    }
}

/**
 * Calculate splits based on item assignments
 */
export function calculateSplits(
    items: ParsedItem[],
    vat?: number,
    serviceCharge?: number,
    sharedUserIds?: string[]
): Record<string, number> {
    const splits: Record<string, number> = {}

    // Add up individual item assignments
    for (const item of items) {
        if (item.assignedTo && item.assignedTo !== 'shared') {
            splits[item.assignedTo] = (splits[item.assignedTo] || 0) + item.totalPrice
        }
    }

    // Calculate shared items total
    const sharedItems = items.filter((item) => !item.assignedTo || item.assignedTo === 'shared')
    let sharedTotal = sharedItems.reduce((sum, item) => sum + item.totalPrice, 0)

    // Add VAT and service charge to shared
    if (vat) sharedTotal += vat
    if (serviceCharge) sharedTotal += serviceCharge

    // Split shared items among all users or specified shared users
    const usersToSplit = sharedUserIds || Object.keys(splits)
    if (usersToSplit.length > 0 && sharedTotal > 0) {
        const perPerson = sharedTotal / usersToSplit.length
        for (const userId of usersToSplit) {
            splits[userId] = (splits[userId] || 0) + perPerson
        }
    }

    // Round to 2 decimal places
    for (const userId in splits) {
        splits[userId] = Math.round(splits[userId] * 100) / 100
    }

    return splits
}
