/**
 * Philippine receipt parser
 * Extracts line items, prices, VAT, and totals from OCR text
 * Optimized for Jollibee, McDonald's, Chowking, and other PH fast food chains
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
    parseConfidence: number      // 0-100 parse quality score
    validationWarnings: string[] // Human-readable issues found
}

// ============================================================================
// PHILIPPINE FAST FOOD ABBREVIATION DICTIONARIES
// ============================================================================

/**
 * Jollibee POS abbreviations and food calling codes
 */
const JOLLIBEE_ABBREVIATIONS: Record<string, string> = {
    // Chicken
    CHJOL: 'Chickenjoy',
    CHKNJY: 'Chickenjoy',
    'CJ': 'Chickenjoy',
    'SPICY CHJOL': 'Spicy Chickenjoy',
    'SPICY CJ': 'Spicy Chickenjoy',
    SINGLE: '1pc Chickenjoy',
    JOYRICE: '2pc Chickenjoy',
    'CHICKEN MEAL': 'Chickenjoy with Spaghetti',
    'SINGLE STEAK': 'Chickenjoy with Burgersteak',
    'CHIX FILLET': 'Chicken Fillet',
    'CHKN FILLET': 'Chicken Fillet',
    // Burgers
    Y: 'Yumburger',
    YUM: 'Yumburger',
    YC: 'Cheeseburger',
    'BACON YC': 'Bacon Cheesy Yumburger',
    'CHEESY YUM': 'Cheeseburger',
    'ALOHA YUM': 'Aloha Yumburger',
    // Hotdog
    HD: 'Jolly Hotdog',
    'JOLLY HD': 'Jolly Hotdog',
    'CHEESY HD': 'Cheesy Jolly Hotdog',
    // Pasta & Noodles
    SPAG: 'Spaghetti',
    'JOLLY SPAG': 'Jolly Spaghetti',
    PALABOK: 'Palabok',
    'CREAMY SOUP': 'Macaroni Soup',
    // Drinks
    ITR: 'Iced Tea Regular',
    ITL: 'Iced Tea Large',
    PJR: 'Pineapple Juice Regular',
    PJL: 'Pineapple Juice Large',
    // Desserts
    FUDGE: 'Chocolate Sundae',
    HAZELNUT: 'Mango Graham Sundae',
    PMP: 'Peach Mango Pie',
    'PEACH TRIO': '3pcs Peach Mango Pie',
    'BUKO TRIO': '3pcs Buko Pie',
    'STRAWBERRY TRO': '3pcs Strawberry Pie',
    'TUNA TRIO': '3pcs Tuna Pie',
    'SPICY TUNA TRIO': '3pcs Spicy Tuna Pie',
}

/**
 * McDonald's Philippines abbreviations
 */
const MCDONALDS_ABBREVIATIONS: Record<string, string> = {
    // Main items
    MCFL: 'McFloat',
    MCSP: 'McSpaghetti',
    MCDO: 'McChicken',
    'BIG MAC': 'Big Mac',
    'QP': 'Quarter Pounder',
    'QPC': 'Quarter Pounder with Cheese',
    FRIES: 'Fries',
    'FF': 'French Fries',
    'HASH BROWN': 'Hash Brown',
    'HASH BRN': 'Hash Brown',
    MCNUG: 'McNuggets',
    'HAPPY ML': 'Happy Meal',
    // From actual receipts
    'T CKNFIL': 'Chicken Fillet',
    'CKNFIL': 'Chicken Fillet',
    'CKNFL': 'Chicken Fillet',
    'T CKNFIL RICE': 'Chicken Fillet with Rice',
    'OREO MCFLURRY': 'Oreo McFlurry',
    'MCFLURRY': 'McFlurry',
    'MCCHICKEN': 'McChicken',
    'MCSPAGHETTI': 'McSpaghetti',
    'CHEESEBURGER': 'Cheeseburger',
    'BURGER MCDO': 'Burger McDo',
    'CRISPY CHKN': 'Crispy Chicken',
    'CRISPY CHICKEN': 'Crispy Chicken',
    'SUNDAE': 'Sundae',
    'HOT FUDGE': 'Hot Fudge Sundae',
    'COKE': 'Coke',
    'SPRITE': 'Sprite',
    'ICED TEA': 'Iced Tea',
}

/**
 * Chowking abbreviations
 */
const CHOWKING_ABBREVIATIONS: Record<string, string> = {
    CHAO: 'Chao Fan',
    'CHAO FAN': 'Chao Fan',
    HALO: 'Halo-Halo',
    'HALO HALO': 'Halo-Halo',
    SIOMAI: 'Siomai',
    LAURIAT: 'Lauriat',
    CHAOSR: 'Chinese Style Fried Rice',
    WONTON: 'Wonton Noodles',
}

/**
 * Greenwich abbreviations
 */
const GREENWICH_ABBREVIATIONS: Record<string, string> = {
    'LASAG': 'Lasagna',
    'OVERLD': 'Overload Pizza',
    'HAW SUP': 'Hawaiian Supreme',
}

/**
 * General PH fast food terms
 */
const GENERAL_ABBREVIATIONS: Record<string, string> = {
    // Sizes
    RG: 'Regular',
    REG: 'Regular',
    SM: 'Small',
    MD: 'Medium',
    MED: 'Medium',
    LG: 'Large',
    XL: 'Extra Large',
    JR: 'Junior',
    // Meal modifiers
    ML: 'Meal',
    MEAL: 'Meal',
    BET: 'Better',
    BETTER: 'Better',
    UPRG: 'Upgrade',
    UPG: 'Upgrade',
    SOLO: 'Solo',
    // Common terms
    PC: 'pc',
    PCS: 'pcs',
    'W/': 'with',
    'W/O': 'without',
    RICE: 'Rice',
    EXTRA: 'Extra',
    ADD: 'Add-on',
    'G RICE': 'Garlic Rice',
    'JAVA RICE': 'Java Rice',
    'PLAIN RICE': 'Plain Rice',
}

// Combine all abbreviations
const ALL_ABBREVIATIONS: Record<string, string> = {
    ...JOLLIBEE_ABBREVIATIONS,
    ...MCDONALDS_ABBREVIATIONS,
    ...CHOWKING_ABBREVIATIONS,
    ...GREENWICH_ABBREVIATIONS,
    ...GENERAL_ABBREVIATIONS,
}

// ============================================================================
// PATTERNS
// ============================================================================

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
    { pattern: /JOLLIBEE/i, name: 'Jollibee' },
    { pattern: /MCDONALD'?S/i, name: "McDonald's" },
    { pattern: /CHOWKING/i, name: 'Chowking' },
    { pattern: /GREENWICH/i, name: 'Greenwich' },
    { pattern: /KFC/i, name: 'KFC' },
    { pattern: /STARBUCKS/i, name: 'Starbucks' },
    { pattern: /SM\s*(?:SUPERMARKET|HYPERMARKET|STORE)/i, name: 'SM' },
    { pattern: /7[-\s]?ELEVEN/i, name: '7-Eleven' },
    { pattern: /MERCURY\s*DRUG/i, name: 'Mercury Drug' },
    { pattern: /PUREGOLD/i, name: 'Puregold' },
    { pattern: /ROBINSONS?\s*(?:SUPERMARKET)?/i, name: 'Robinsons' },
    { pattern: /MINISTOP/i, name: 'Ministop' },
    { pattern: /ALFAMART/i, name: 'Alfamart' },
    { pattern: /WATSONS/i, name: 'Watsons' },
    { pattern: /NATIONAL\s*BOOK\s*STORE/i, name: 'National Bookstore' },
    { pattern: /BONCHON/i, name: 'Bonchon' },
    { pattern: /ARMY\s*NAVY/i, name: 'Army Navy' },
    { pattern: /MANG\s*INASAL/i, name: 'Mang Inasal' },
    { pattern: /MAX'?S\s*(?:RESTAURANT)?/i, name: "Max's" },
    { pattern: /SHAKEY'?S/i, name: "Shakey's" },
    { pattern: /YELLOW\s*CAB/i, name: 'Yellow Cab' },
    { pattern: /PIZZA\s*HUT/i, name: 'Pizza Hut' },
]

// Lines to skip (headers, footers, BIR accounting lines, etc.)
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
    /^QTY\s+(?:DESCRIPTION|ITEM)/i,
    /^DESCRIPTION\s+AMOUNT/i,
    // BIR-required accounting lines - these should NEVER be items
    /ZERO\s*RATED\s*SALES?/i,
    /JERO\s*RATED\s*SALES?/i, // OCR misread of Zero
    /VAT\s*EXEMPT\s*SALES?/i,
    /VAT\s*EXEMPTION/i,
    /VATABLE\s*SALES?/i,
    /VATEABLE\s*SALES?/i, // OCR misread
    /VAT\s*AMOUNT/i,
    /TAKE[\s-]*OUT\s*TOTAL/i,
    /CASH\s*TENDER/i,
    /CASH\s*TENDERED/i,
    /^CHANGE\b/i,
    /^CASH\b/i,
    /CREDIT\s*CARD/i,
    /GCASH/i,
    /MAYA/i,
    /PAYMAYA/i,
    /^ACC\s*NO/i,
    /^SUPPLIER/i,
    /^VALID\s*UNTIL/i,
    /^DATE\s*ISSUED/i,
    /^PERMIT\s*TO\s*USE/i,
    /^PTU:/i,
    /^MIN:/i,
    /^HARDWARE\s*SERIAL/i,
    /^CREW\s*ID/i,
    /INVOICE.*RECEIPT/i,
    /^YOUR\s*ORDER\s*NUMBER/i,
    /^CUSTOMER.*INFORMATION/i,
    /^NAME\s*:/i,
    /^ADDRESS\s*:/i,
    /^BUSINESS\s*STYLE/i,
    /GOLDEN\s*ARCHES/i, // McDonald's corporate
    /GIANT\s*ARCHES/i, // McDonald's corporate OCR variant
    /^FOR\s*ONLINE\s*DELIVERY/i,
    /SURVEY\s*CODE/i,
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply common OCR corrections for Philippine thermal receipts
 * Enhanced with comprehensive digit and word corrections
 */
function correctOCRMistakes(text: string): string {
    return text
        // Common letter/number confusions in prices
        .replace(/[O0](\.\d{2})/g, '0$1')     // O.00 -> 0.00
        .replace(/(\d)[lI]/g, '$11')          // 1l -> 11
        .replace(/[lI](\d)/g, '1$1')          // l9 -> 19
        .replace(/[S5](\.\d{2})/g, '5$1')     // S.00 -> 5.00
        .replace(/[B8](\.\d{2})/g, '8$1')     // B.00 -> 8.00

        // Additional digit confusions in the middle of numbers
        .replace(/(\d)O(\d)/g, '$10$2')       // 1O5 -> 105
        .replace(/(\d)o(\d)/g, '$10$2')       // 1o5 -> 105
        .replace(/S(\d{2,})/g, '5$1')         // S00 -> 500
        .replace(/(\d)S(\d)/g, '$15$2')       // 9S0 -> 950
        .replace(/Z(\d)/g, '2$1')             // Z5 -> 25
        .replace(/(\d)Z/g, '$12')             // 5Z -> 52
        .replace(/(\d)G/g, '$16')             // 5G -> 56 (G looks like 6)
        .replace(/G(\d)/g, '6$1')             // G5 -> 65

        // Missing decimal points (common in faded thermal)
        .replace(/(\d{2,3})(00)\s*$/gm, '$1.$2')

        // Fix peso symbol
        .replace(/[Pp]\s*(\d)/g, '₱$1')

        // Fix common words - basic
        .replace(/T0TAL/gi, 'TOTAL')
        .replace(/SUBT0TAL/gi, 'SUBTOTAL')
        .replace(/CHANGER/gi, 'CHANGE')
        .replace(/VAI/gi, 'VAT')
        .replace(/IOTAL/gi, 'TOTAL')

        // Fix common words - enhanced for PH receipts
        .replace(/VATAB[IL]E/gi, 'VATABLE')
        .replace(/SUBTOT[A4]L/gi, 'SUBTOTAL')
        .replace(/D[1I]SCOUNT/gi, 'DISCOUNT')
        .replace(/SERV[1I]CE/gi, 'SERVICE')
        .replace(/CH[A4]NGE/gi, 'CHANGE')
        .replace(/T[O0]TAL/gi, 'TOTAL')
        .replace(/AM[O0]UNT/gi, 'AMOUNT')

        // Fix merged lines (price immediately followed by text)
        .replace(/(\d{2,}\.\d{2})([A-Z])/g, '$1\n$2')
}

/**
 * Expand abbreviations in item name
 */
function expandAbbreviations(text: string): string {
    let result = text.toUpperCase()

    // Try exact match first
    if (ALL_ABBREVIATIONS[result]) {
        return ALL_ABBREVIATIONS[result]
    }

    // Try to match and replace parts
    const words = result.split(/\s+/)
    const expandedWords = words.map((word) => {
        // Remove trailing punctuation for matching
        const cleanWord = word.replace(/[.,;:!?]$/, '')
        if (ALL_ABBREVIATIONS[cleanWord]) {
            return ALL_ABBREVIATIONS[cleanWord] + word.slice(cleanWord.length)
        }
        return word
    })

    result = expandedWords.join(' ')

    // Title case the result
    return result
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Extract price from a string - enhanced for PH receipts
 */
function extractPrice(text: string): number | null {
    // Try currency patterns first
    for (const pattern of CURRENCY_PATTERNS) {
        pattern.lastIndex = 0
        const match = pattern.exec(text)
        if (match) {
            const value = parseFloat(match[1].replace(/,/g, ''))
            if (value > 0 && value < 100000) return value
        }
    }

    // Look for price at the end of line (common receipt format)
    const endMatch = text.match(/([\d,]+\.[\d]{2})\s*$/)
    if (endMatch) {
        const value = parseFloat(endMatch[1].replace(/,/g, ''))
        if (value > 0 && value < 100000) return value
    }

    // Look for price anywhere with reasonable value
    const anyMatch = text.match(/\b([\d]{1,4})\.[\d]{2}\b/)
    if (anyMatch) {
        const value = parseFloat(anyMatch[0].replace(/,/g, ''))
        if (value > 0 && value < 10000) return value
    }

    return null
}

/**
 * Extract quantity from item line - enhanced for PH receipts
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

    // Pattern: "1PC" or "2PCS" or "1 PC" (common in PH receipts)
    match = text.match(/^(\d+)\s*(?:PC|PCS)\s+(.+)/i)
    if (match) {
        return { quantity: parseInt(match[1]), cleanedText: match[2] }
    }

    // Pattern: "2 Item" (number at start, not a price-like number)
    match = text.match(/^(\d+)\s+([A-Za-z].+)/)
    if (match && parseInt(match[1]) <= 20) {
        return { quantity: parseInt(match[1]), cleanedText: match[2] }
    }

    return { quantity: 1, cleanedText: text }
}

/**
 * Try to parse column-based receipt line
 * Supports formats:
 * - QTY ITEM PRICE TOTAL (McDonald's format)
 * - QTY ITEM PRICE
 * - ITEM PRICE
 */
function parseColumnarLine(line: string): ParsedItem | null {
    // McDonald's 4-column format: "1 T CknFil Rice   65.00   65.00"
    // Pattern: quantity, item name, unit price, total price
    const fourColMatch = line.match(/^(\d+)\s+(.+?)\s{2,}([\d,.]+)\s{2,}([\d,.]+)$/)
    if (fourColMatch) {
        const quantity = parseInt(fourColMatch[1])
        const unitPrice = parseFloat(fourColMatch[3].replace(/,/g, ''))
        const totalPrice = parseFloat(fourColMatch[4].replace(/,/g, ''))

        // Validate: total should roughly equal qty * unit price
        if (quantity > 0 && quantity <= 20 && totalPrice > 0 && totalPrice < 100000) {
            // Use total price as it's more reliable
            let name = fourColMatch[2].trim()
            name = expandAbbreviations(name)

            return {
                id: crypto.randomUUID(),
                name,
                quantity,
                unitPrice: Math.round(unitPrice * 100) / 100,
                totalPrice: totalPrice,
            }
        }
    }

    // 3-column format: "1    SPICY CHJOL ML     169.00"
    const threeColMatch = line.match(/^(\d+)\s{2,}(.+?)\s{2,}([\d,.]+)$/)
    if (threeColMatch) {
        const quantity = parseInt(threeColMatch[1])
        const price = parseFloat(threeColMatch[3].replace(/,/g, ''))

        if (quantity > 0 && quantity <= 20 && price > 0 && price < 100000) {
            let name = threeColMatch[2].trim()
            name = expandAbbreviations(name)

            return {
                id: crypto.randomUUID(),
                name,
                quantity,
                unitPrice: Math.round((price / quantity) * 100) / 100,
                totalPrice: price,
            }
        }
    }

    // Single space separated: "1 T CknFil Rice 65.00 65.00"
    // Match: digit(s) at start, words in middle, two numbers at end
    const spaceSepMatch = line.match(/^(\d+)\s+([A-Za-z].+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})$/)
    if (spaceSepMatch) {
        const quantity = parseInt(spaceSepMatch[1])
        const totalPrice = parseFloat(spaceSepMatch[4])

        if (quantity > 0 && quantity <= 20 && totalPrice > 0 && totalPrice < 10000) {
            let name = spaceSepMatch[2].trim()
            name = expandAbbreviations(name)

            return {
                id: crypto.randomUUID(),
                name,
                quantity,
                unitPrice: Math.round((totalPrice / quantity) * 100) / 100,
                totalPrice: totalPrice,
            }
        }
    }

    return null
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
    if (/^(?:TOTAL|SUB\s*TOTAL|VAT|CHANGE|CASH|TENDER|AMOUNT|DISCOUNT)/i.test(trimmed)) {
        return true
    }

    return false
}

/**
 * Parse a single item line - enhanced with abbreviation expansion
 */
function parseItemLine(line: string): ParsedItem | null {
    const trimmed = line.trim()

    // Try columnar parsing first
    const columnarResult = parseColumnarLine(trimmed)
    if (columnarResult) return columnarResult

    // Extract price first
    const price = extractPrice(trimmed)
    if (price === null || price <= 0) return null

    // Remove price from line to get item name
    let itemText = trimmed
    for (const pattern of CURRENCY_PATTERNS) {
        itemText = itemText.replace(pattern, '')
    }
    itemText = itemText.replace(/([\d,]+\.[\d]{2})\s*$/, '').trim()
    itemText = itemText.replace(/^\d+\.\d{2}\s*/, '').trim() // Remove price at start too

    // Extract quantity
    const { quantity, cleanedText } = extractQuantity(itemText)

    // Clean up item name
    let name = cleanedText
        .replace(/^[-*•]\s*/, '') // Remove bullet points
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

    if (name.length < 2) return null

    // Expand abbreviations
    name = expandAbbreviations(name)

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
    // Check first 10 lines for store patterns
    const headerLines = lines.slice(0, 10).join(' ')

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

    for (const line of lines.slice(0, 15)) {
        for (const pattern of datePatterns) {
            const match = line.match(pattern)
            if (match) return match[1]
        }
    }

    return undefined
}

// ============================================================================
// VALIDATION & FALLBACK PARSING
// ============================================================================

/**
 * Flexible fallback parser for lines that didn't match strict patterns
 * Extracts items by finding all prices and using heuristics
 */
function parseLineFlexible(line: string): ParsedItem | null {
    const trimmed = line.trim()

    // Extract ALL prices from the line
    const priceMatches = [...trimmed.matchAll(/\d+\.\d{2}/g)]
    if (priceMatches.length === 0) return null

    // Take the last price as total (most common format)
    const totalPrice = parseFloat(priceMatches[priceMatches.length - 1][0])
    if (totalPrice <= 0 || totalPrice > 10000) return null

    // Extract quantity if present at start
    const qtyMatch = trimmed.match(/^(\d+)\s+/)
    let quantity = 1
    if (qtyMatch) {
        const parsed = parseInt(qtyMatch[1])
        if (parsed > 0 && parsed <= 20) {
            quantity = parsed
        }
    }

    // Everything else is the item name
    let name = trimmed
        .replace(/\d+\.\d{2}/g, '')   // Remove prices
        .replace(/^(\d+)\s+/, '')      // Remove quantity
        .replace(/[₱P]\s*/g, '')       // Remove currency
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim()

    if (name.length < 2) return null

    // Skip if it looks like a summary line
    if (/^(TOTAL|SUBTOTAL|VAT|CHANGE|CASH|NET|AMOUNT)/i.test(name)) return null

    name = expandAbbreviations(name)

    return {
        id: crypto.randomUUID(),
        name,
        quantity,
        unitPrice: Math.round((totalPrice / quantity) * 100) / 100,
        totalPrice,
    }
}

/**
 * Validate parsed receipt data and calculate confidence score
 * Returns a score from 0-100 and a list of warnings
 */
function validateParsedReceipt(receipt: {
    items: ParsedItem[]
    total: number
    subtotal?: number
    vat?: number
    serviceCharge?: number
    discount?: number
}): { confidence: number; warnings: string[] } {
    const warnings: string[] = []
    let score = 100

    // Check 1: Items sum vs expected total (most important)
    const itemsSum = receipt.items.reduce((s, i) => s + i.totalPrice, 0)

    // Calculate what items should sum to:
    // For most PH receipts: items = subtotal, and total = subtotal + VAT
    // Or if no subtotal: items ≈ total - VAT - service + discount
    let expectedSum = receipt.subtotal || receipt.total
    if (!receipt.subtotal && receipt.total > 0) {
        expectedSum = receipt.total
        if (receipt.vat) expectedSum -= receipt.vat
        if (receipt.serviceCharge) expectedSum -= receipt.serviceCharge
        if (receipt.discount) expectedSum += receipt.discount
    }

    const tolerance = Math.max(expectedSum * 0.15, 5) // 15% or ₱5 minimum tolerance
    const difference = Math.abs(itemsSum - expectedSum)

    if (expectedSum > 0 && difference > tolerance) {
        score -= 25
        warnings.push(`Items sum (₱${itemsSum.toFixed(2)}) differs from expected (₱${expectedSum.toFixed(2)}) by ₱${difference.toFixed(2)}`)
    }

    // Check 2: Reasonable item prices for PH fast food (₱15-2000 typical)
    for (const item of receipt.items) {
        if (item.unitPrice < 5) {
            score -= 5
            warnings.push(`Low price: "${item.name}" @ ₱${item.unitPrice.toFixed(2)}`)
        }
        if (item.unitPrice > 2000) {
            score -= 5
            warnings.push(`High price: "${item.name}" @ ₱${item.unitPrice.toFixed(2)}`)
        }
        // Check quantity makes sense
        if (item.quantity > 10) {
            score -= 3
            warnings.push(`High quantity: ${item.quantity}x "${item.name}"`)
        }
    }

    // Check 3: Found a total
    if (receipt.total === 0) {
        score -= 20
        warnings.push('No total found on receipt')
    }

    // Check 4: Found at least one item
    if (receipt.items.length === 0) {
        score -= 30
        warnings.push('No items found on receipt')
    }

    // Check 5: Total is reasonable for the number of items
    if (receipt.items.length > 0 && receipt.total > 0) {
        const avgPerItem = receipt.total / receipt.items.length
        if (avgPerItem < 10) {
            score -= 10
            warnings.push(`Average per item (₱${avgPerItem.toFixed(2)}) seems too low`)
        }
        if (avgPerItem > 1000) {
            score -= 10
            warnings.push(`Average per item (₱${avgPerItem.toFixed(2)}) seems high for fast food`)
        }
    }

    return { confidence: Math.max(0, Math.min(100, score)), warnings }
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Parse OCR text into structured receipt data
 * Includes validation and confidence scoring
 */
export function parseReceipt(ocrText: string): ParsedReceipt {
    // Apply OCR corrections
    const correctedText = correctOCRMistakes(ocrText)
    const lines = correctedText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

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

    // Parse line items with fallback to flexible parser
    for (const line of lines) {
        if (shouldSkipLine(line)) continue

        // Try strict parsing first
        let item = parseItemLine(line)

        // Fallback to flexible parsing if strict fails
        if (!item) {
            item = parseLineFlexible(line)
        }

        if (item) {
            // Skip if this looks like the total or subtotal
            if (Math.abs(item.totalPrice - total) < 0.01) continue
            if (subtotal && Math.abs(item.totalPrice - subtotal) < 0.01) continue
            // Skip if it matches VAT or service charge
            if (vat && Math.abs(item.totalPrice - vat) < 0.01) continue
            if (serviceCharge && Math.abs(item.totalPrice - serviceCharge) < 0.01) continue

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

    // Validate the parsed receipt
    const { confidence, warnings } = validateParsedReceipt({
        items,
        total,
        subtotal,
        vat,
        serviceCharge,
        discount,
    })

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
        parseConfidence: confidence,
        validationWarnings: warnings,
    }
}

// ============================================================================
// SPLIT CALCULATION
// ============================================================================

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
