# Frontend

> React PWA architecture and patterns.

---

## Keywords

`React` `React 19` `Vite` `TypeScript` `TailwindCSS` `TanStack Query` `React Query` `React Router` `PWA` `Progressive Web App` `Service Worker` `Push Notifications` `OAuth` `JWT` `Token Refresh`

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Build Tool | Vite |
| Language | TypeScript |
| Styling | TailwindCSS |
| State/Cache | TanStack React Query |
| Routing | React Router 7 |
| OAuth | @react-oauth/google |

---

## Quick Start

### Development
```bash
cd frontend
npm install
npm run dev                    # Start dev server (port 5173)
npm run dev -- --host         # Expose on network
```

### Build
```bash
npm run build                  # TypeScript check + production build
npm run lint                   # ESLint
```

---

## Directory Structure

```
frontend/
├── public/
│   └── sw.js                  # Service worker (offline + push)
├── src/
│   ├── main.tsx               # App entry, providers
│   ├── App.tsx                # Router configuration
│   └── payup/
│       ├── PayUpApp.tsx       # Main authenticated app
│       ├── Fonts.tsx          # Custom font loading
│       ├── types.ts           # Shared TypeScript types
│       ├── api/
│       │   ├── client.ts      # HTTP client with auth
│       │   └── endpoints.ts   # API endpoint wrappers
│       ├── auth/
│       │   ├── AuthProvider.tsx    # Auth context
│       │   ├── RequireAuth.tsx     # Protected route wrapper
│       │   └── useAuth.ts          # Auth hook
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── BottomNav.tsx
│       │   ├── GroupList.tsx
│       │   ├── ExpenseList.tsx
│       │   ├── BalanceCard.tsx
│       │   ├── Toast.tsx
│       │   └── modals/        # Modal components
│       │       ├── AddExpenseModal.tsx
│       │       ├── PaymentModal.tsx
│       │       ├── InviteModal.tsx
│       │       ├── ProfileModal.tsx
│       │       └── PushPromptModal.tsx
│       ├── constants/
│       │   └── categories.ts  # Expense categories
│       ├── hooks/
│       │   ├── useToast.ts
│       │   ├── useGroups.ts
│       │   └── useExpenses.ts
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   └── JoinGroupPage.tsx
│       ├── push/
│       │   └── pushManager.ts # Push notification logic
│       ├── pwa/
│       │   └── register.ts    # SW registration
│       ├── ui/
│       │   └── Button.tsx     # Reusable primitives
│       └── utils/
│           ├── receiptParser.ts  # OCR receipt parsing
│           └── format.ts         # Formatting utilities
└── index.html
```

---

## Entry Points

| File | Purpose |
|------|---------|
| [`main.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/main.tsx) | React root, QueryClient, AuthProvider, SW registration |
| [`App.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/App.tsx) | React Router configuration |
| [`PayUpApp.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/PayUpApp.tsx) | Main authenticated app UI |

---

## Client-Side Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | LandingPage | No |
| `/auth/login` | LoginPage | No |
| `/auth/register` | RegisterPage | No |
| `/join/:code` | JoinGroupPage | No (redirects if needed) |
| `/app` | PayUpApp | Yes |

---

## API Client

### Architecture

[`api/client.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/api/client.ts) handles:

1. **Token Storage**: `localStorage` key `payup_tokens_v1`
2. **Auto-inject**: `Authorization: Bearer <accessToken>` on all requests
3. **Proactive Refresh**: Checks expiry before each request, refreshes if ≤2min remaining
4. **Reactive Fallback**: Still handles 401 as safety net

### Token Refresh Flow

```typescript
// Before each request:
if (tokenExpiresIn <= 2 minutes) {
    await refreshTokens();
}

// On any request:
if (response.status === 401) {
    await refreshTokens();
    retry request;
}
```

### Rate Limit Handling

Automatic retry with exponential backoff on 429:
- Initial delay: 500ms
- Max delay: 30s
- Max retries: 3
- Includes jitter to prevent thundering herd

---

## Authentication

### AuthProvider

[`auth/AuthProvider.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/auth/AuthProvider.tsx) provides:

```typescript
interface AuthContext {
    user: User | null;
    isLoading: boolean;
    login: (email, password) => Promise<void>;
    register: (email, password, name) => Promise<void>;
    loginWithGoogle: (credential) => Promise<void>;
    logout: () => void;
}
```

### Token Storage

| Token | Storage | Reason |
|-------|---------|--------|
| Access (15min) | sessionStorage | Cleared on tab close |
| Refresh (30 days) | localStorage | Persists across sessions |

---

## Data Fetching

### TanStack Query Patterns

All data fetching uses React Query with custom hooks:

```typescript
// hooks/useGroups.ts
export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: endpoints.listGroups,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// hooks/useExpenses.ts
export function useExpenses(groupId: string) {
    return useQuery({
        queryKey: ['expenses', groupId],
        queryFn: () => endpoints.listExpenses(groupId),
    });
}
```

### Query Key Conventions

| Query | Key |
|-------|-----|
| All groups | `['groups']` |
| Group details | `['groups', groupId]` |
| Group expenses | `['expenses', groupId]` |
| Group balances | `['balances', groupId]` |
| User profile | `['user', 'me']` |
| Nudges | `['nudges']` |
| Payments | `['payments', status]` |

### Invalidation

```typescript
// After creating expense:
queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
```

---

## PWA Support

### Service Worker

[`public/sw.js`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/public/sw.js) handles:

1. **Offline Caching**: Core assets cached on install
2. **API Bypass**: Requests to `/v1/` are never cached
3. **Push Events**: Displays notifications
4. **Notification Click**: Opens app to relevant page

### Registration

```typescript
// main.tsx
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
```

### Push Manager

[`push/pushManager.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/push/pushManager.ts):

```typescript
// Request permission and subscribe
const subscription = await subscribeToPush();

// Sends to backend:
// POST /v1/push/subscribe { endpoint, keys: { p256dh, auth } }
```

Requires `VITE_VAPID_PUBLIC_KEY` environment variable.

---

## Component Patterns

### Modal Components

Modals in `components/modals/`:
- Self-contained with their own state
- Use portals for proper z-index
- Handle escape key and click-outside
- Swipe-down gesture for mobile dismiss

### Toast Notifications

Global toast system via `useToast` hook:

```typescript
const { showToast } = useToast();

showToast('Expense added!', 'success');
showToast('Failed to save', 'error');
```

---

## Receipt OCR

[`utils/receiptParser.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/utils/receiptParser.ts):

- Uses Google Gemini API for OCR
- Image preprocessing with OpenCV.js
- Multi-pass recognition
- Post-processing corrections for Philippine receipts
- Extracts line items with prices

---

## Common Tasks

### Add new API endpoint usage

1. Add function in [`api/endpoints.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/api/endpoints.ts)
2. Create React Query hook if needed
3. Use in component

### Add new page

1. Create component in `pages/`
2. Add route in `App.tsx`
3. Wrap with `RequireAuth` if authentication required

### Add new modal

1. Create component in `components/modals/`
2. Handle open/close state in parent
3. Use portal for rendering

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_BASE_URL` | No | API base (uses Vite proxy in dev) |
| `VITE_VAPID_PUBLIC_KEY` | For push | VAPID public key |
| `VITE_GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |

---

## See Also

- [Reference Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/REFERENCE.md) – Feature→code mappings
- [API.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/API.md) – Backend API details
- [ARCHITECTURE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/ARCHITECTURE.md) – System design
- [UX_SPEC.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/UX_SPEC.md) – UI/UX patterns
- [PWA Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/guides/pwa-guide.md) – PWA setup details
