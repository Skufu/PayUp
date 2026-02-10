# PayUp UX Specification

> UX decisions and UI patterns for the PayUp expense-splitting application.

Living document – Last updated: 2026-01-02

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

**Component:** [`components/Toast.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/components/Toast.tsx)

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

**Component:** [`components/modals/AddExpenseModal.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/components/modals/AddExpenseModal.tsx)

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

**Defined in:** [`constants/categories.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/constants/categories.ts)

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
| Toast queue (max 3) | ✅ Done | |
| Toast push animation | ✅ Done | |
| Safe-area positioning | ✅ Done | |
| aria-live on toasts | ✅ Done | |
| Character counter | ✅ Done | Title field |
| Responsive categories | ✅ Done | Grid on md+ |
| Haptic feedback | ✅ Done | Navigator.vibrate |
| Swipe-down modal | ✅ Done | Gesture dismiss |
| Receipt OCR | ✅ Done | Gemini API |
| User exclusion in splits | ✅ Done | Hybrid mode |

---

## Changelog

### 2026-01-02
- Updated implementation status
- Added split modes documentation
- Added swipe-down gesture details

### 2026-01-01 - Initial Specification
- Documented all UX decisions from implementation review
- Established patterns for toasts, forms, selectors, badges
- Defined responsive behavior and accessibility requirements

---

## See Also

- [FRONTEND.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/FRONTEND.md) – React component structure
- [Reference Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/REFERENCE.md) – Feature→code mappings
