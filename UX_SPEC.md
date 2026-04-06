# PayUp UX Specification

> UX decisions and UI patterns for the PayUp expense-splitting application.

Living document – Last updated: 2026-04-07

---

## Keywords

`user experience` `UI patterns` `toast notifications` `expense form` `category selector` `badges` `haptic feedback` `accessibility` `responsive design` `mobile-first` `PWA` `modals` `gestures` `color system`

---

## Table of Contents

- [Toast Notification System](#toast-notification-system)
- [Expense Form](#expense-form)
- [Category Selector](#category-selector)
- [Split Modes](#split-modes)
- [Badges & Visual Indicators](#badges--visual-indicators)
- [Feedback & Haptics](#feedback--haptics)
- [Authentication UI](#authentication-ui)
- [Modals](#modals)
- [Accessibility](#accessibility)
- [Responsive Behavior](#responsive-behavior)
- [Color System](#color-system)
- [Implementation Status](#implementation-status)

---

## Toast Notification System

**Component:** [`components/Toast.tsx`](file:///Users/adriangabriellfrancisco/workspace/github.com/Skufu/PayUp/frontend/src/payup/components/Toast.tsx)

### Queue Behavior
- **Maximum visible**: 3 toasts at once
- **Overflow handling**: 4th toast pushes oldest out with upward animation
- **Animation**: New toast enters from bottom, existing toasts shift up

### Timing
- **Duration**: Fixed 3 seconds for all types
- **No undo actions**: Simple confirmations only

### Content
- **Generic messages**: "Expense added!" (not "Added: Jollibee - ₱450")
- **Types**: success (lime), error (red), warning (orange), info (blue)

### Positioning
- **Location**: Centered horizontally, above bottom navigation
- **Safe areas**: CSS `env(safe-area-inset-bottom)` for device notches
- **Z-index**: 100

### Accessibility
- **Screen readers**: `aria-live="polite"` for non-intrusive announcements
- **Focus**: Toasts do not trap focus

---

## Expense Form

**Component:** [`components/modals/AddExpenseModal.tsx`](file:///Users/adriangabriellfrancisco/workspace/github.com/Skufu/PayUp/frontend/src/payup/components/modals/AddExpenseModal.tsx)

### Title Field
- **Soft limit**: 50 characters
- **Warning style**: Character counter (e.g., "45/50") turns red when exceeded
- **No hard limit**: Allow longer titles with warning

### Amount Field
- **Auto-calculation**: Updates automatically in itemized mode
- **Currency**: Philippine Peso (₱) prefix, 2 decimal places
- **Validation**: Must be > 0

### Payer
- **Default**: Current user (expense creator)
- **Selection**: Not displayed (current user always pays)

### Validation
- **Required fields**: Title, Amount
- **Splits validation**: Must sum to total amount exactly

---

## Category Selector

### Available Categories

| Category | Icon | Emoji Fallback |
|----------|------|----------------|
| Food | 🍔 | 🍔 |
| Transport | 🚗 | 🚗 |
| Shopping | 🛍️ | 🛍️ |
| Entertainment | 🎬 | 🎬 |
| Utilities | 💡 | 💡 |
| Travel | ✈️ | ✈️ |
| Health | 🏥 | 🏥 |
| Other | 📦 | 📦 |

**Implementation:** Categories are hardcoded in [`components/modals/AddExpenseModal.tsx`](file:///Users/adriangabriellfrancisco/workspace/github.com/Skufu/PayUp/frontend/src/payup/components/modals/AddExpenseModal.tsx) as the `CATEGORIES` constant array.

### Icons
- **Primary**: Lucide icons (consistent, cross-platform)
- **Fallback**: Emoji if icons fail to load

### Layout
- **Mobile**: Horizontal scroll
- **Tablet/Desktop (md+)**: 2-3 column grid

### Interaction
- **Default**: "Other" category pre-selected
- **Selection**: Single select, immediate feedback

---

## Split Modes

### Equal Split
Divides expense equally among all selected participants.

### Exact Split
User enters specific amounts for each participant. Must sum to total.

### Percentage Split
User enters percentages for each participant. Must sum to 100%.

### Hybrid Split
Combination of exact amounts and equal distribution of remainder.
- Supports user exclusion (uncheck participants)
- Remainder split equally among non-excluded participants

---

## Badges & Visual Indicators

### Debt Badges ("You Owe")
```css
background: rgba(255, 79, 153, 0.15);  /* #ff4f99 at 15% */
border: 1px solid rgba(255, 79, 153, 0.40);
color: #ff4f99;
```

### Credit Badges ("Owed to You")
```css
background: rgba(223, 255, 79, 0.15);  /* #dfff4f at 15% */
border: 1px solid rgba(223, 255, 79, 0.40);
color: #dfff4f;
```

### Balance Display
- **No truncation**: Full amount always visible
- **Responsive sizing**: `text-3xl` → `text-4xl` → `text-5xl`
- **Color coding**: Pink (debt), Lime (credit), Gray (settled)

---

## Feedback & Haptics

### Haptic Feedback
- **Errors**: Medium vibration on failed actions
- **Success**: Light tap on successful actions
- **User control**: Toggle in profile settings
- **Fallback**: Graceful degradation on unsupported devices

### Visual Feedback
- **Loading states**: Spinner on buttons during async operations
- **Disabled states**: 50% opacity, cursor-not-allowed

### Error States
- **Toast**: Red toast with error icon
- **Form errors**: Red border on invalid fields, error text below

---

## Authentication UI

### Social Login
- **Available**: Google OAuth only
- **Layout**: Compact, single button centered
- **Future providers**: Add only when ready (no "coming soon" placeholders)

### Form Layout
- **Fields**: Email, Password
- **Actions**: Primary submit, link to alternate flow

---

## Modals

### General Patterns
- **Backdrop**: Semi-transparent dark overlay
- **Close**: X button, Escape key, click outside
- **Mobile**: Swipe-down gesture to dismiss
- **Focus**: Trapped within modal while open
- **Scroll**: Content scrolls, header/footer fixed

### Swipe-Down Gesture
- Hold and swipe down on modal to dismiss
- Visual indicator at top of modal
- Threshold: ~100px drag before dismiss triggers

---

## Accessibility

### Screen Readers
- **Toasts**: `aria-live="polite"` announcements
- **Buttons**: Descriptive labels
- **Forms**: Proper label associations

### Keyboard Navigation
- **Focus management**: Logical tab order
- **Modal traps**: Focus contained within open modals
- **Escape key**: Closes modals

### Color Contrast
- **Text on dark**: Minimum 4.5:1 contrast ratio
- **Interactive elements**: Minimum 3:1 contrast ratio
- **Status colors**: Pink (#ff4f99), Lime (#dfff4f) tested on dark backgrounds

---

## Responsive Behavior

### Breakpoints
| Name | Width | Tailwind |
|------|-------|----------|
| Mobile | < 768px | Default |
| Tablet | 768px - 1024px | `md:` |
| Desktop | > 1024px | `lg:` |

### Component Adaptations

| Component | Mobile | Tablet/Desktop |
|-----------|--------|----------------|
| Categories | Horizontal scroll | 2-3 column grid |
| Balance text | text-3xl | text-4xl/5xl |
| Toast position | Above bottom nav | Above bottom nav |
| Side menu | Slide-in overlay | Persistent sidebar |
| Expense list | Full width | Max-width container |

---

## Color System

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Lime | #dfff4f | Success, credit, primary actions |
| Pink | #ff4f99 | Error, debt, warnings |
| Dark | #0a0a0a | Background |
| Gray | #27272a | Cards, secondary backgrounds |

### Text Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #fafafa | Main text |
| Secondary | #a1a1aa | Muted text |
| Placeholder | #71717a | Input placeholders |

---

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Toast push animation | ✅ Done | Framer Motion enter/exit |
| Toast duration (3s) | ✅ Done | Fixed 3000ms |
| Toast types (success/error/warning/info) | ✅ Done | Success uses lime (#dfff4f) |
| Toast positioning | ✅ Done | Centered, fixed bottom-20, z-[100] |
| Responsive categories | ✅ Done | Horizontal scroll on mobile |
| Category selection | ✅ Done | Hardcoded in AddExpenseModal |
| Swipe-down modal | ✅ Done | useSwipeableModal hook |
| Receipt OCR | ✅ Done | Gemini API via ReceiptScanFlow |
| User exclusion in splits | ✅ Done | Hybrid mode |
| Equal split mode | ✅ Done | |
| Hybrid split mode | ✅ Done | Itemized + remainder distribution |
| Toast queue (max 3) | ❌ Not Done | Uses AnimatePresence popLayout |
| Safe-area positioning | ❌ Not Done | No env(safe-area-inset-bottom) |
| aria-live on toasts | ❌ Not Done | Accessibility attribute missing |
| Character counter | ❌ Not Done | No 50-char limit warning |
| Focus trap in modals | ❌ Not Done | No focus trapping implemented |
| Exact split mode | ❌ Not Done | Not available in UI |
| Percentage split mode | ❌ Not Done | Not available in UI |

---

## Known Discrepancies

This section documents differences between this specification and actual implementation.

### Critical (Missing Features)

1. **Toast Queue Limit (max 3):** The specification states a maximum of 3 visible toasts with overflow pushing the oldest out. The actual implementation uses `AnimatePresence mode="popLayout"` which replaces toasts rather than maintaining a queue. To fully implement: Add logic to limit toasts array to 3 items and animate older toasts out.

2. **Focus Trap in Modals:** The specification requires focus to be trapped within open modals. The current implementation does not include focus trapping. Requires implementing focus management when modal opens.

### Medium (Accessibility)

3. **Safe-Area Positioning:** Toast spec mentions `env(safe-area-inset-bottom)` for device notches, but this is not implemented in the Toast component.

4. **aria-live on Toasts:** Toasts should have `aria-live="polite"` for screen reader announcements. Currently not present in the component.

### Low (UX Improvements)

5. **Character Counter:** Title field should show "45/50" counter turning red when exceeded. Not currently implemented.

### Split Modes

6. **Exact Split Mode:** Spec documents "Exact Split" where user enters specific amounts - not implemented. Only Equal and Hybrid modes available.

7. **Percentage Split Mode:** Spec documents "Percentage Split" where user enters percentages - not implemented.

---

## Changelog

### 2026-04-07 - Verification Update
- Verified UX patterns against actual component implementations
- Updated categories reference from non-existent `constants/categories.ts` to actual hardcoded location in AddExpenseModal
- Added "Known Discrepancies" section documenting unimplemented features
- Updated Implementation Status to reflect actual implementation state
- Fixed: Toast queue (max 3) not implemented, Character counter not implemented, Focus trap not implemented, Exact/Percentage split modes not implemented, safe-area and aria-live accessibility features missing
- Updated implementation status
- Added split modes documentation
- Added swipe-down gesture details

### 2026-01-01 - Initial Specification
- Documented all UX decisions from implementation review
- Established patterns for toasts, forms, selectors, badges
- Defined responsive behavior and accessibility requirements

---

## See Also

- [FRONTEND.md](file:///Users/adriangabriellfrancisco/workspace/github.com/Skufu/PayUp/docs/FRONTEND.md) – React component structure
- [Reference Guide](file:///Users/adriangabriellfrancisco/workspace/github.com/Skufu/PayUp/docs/REFERENCE.md) – Feature→code mappings
