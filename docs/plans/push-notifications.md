Brilliant idea! That's **much better UX** than email! Let's do both:

1. **In-app notification** in Activity tab (immediate)
2. **Web Push Notifications** for mobile (when app is closed)

This is way more native and responsive. Here's the implementation:

***

## 🔔 Better Nudge System Implementation

### Phase 1: In-App Notifications (Quick Win - 20 min)

#### 1. Database Schema

**Create `backend/sql/migrations/005_nudges.sql`:**

```sql
-- +goose Up
CREATE TABLE nudges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL,
    message text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nudges_receiver ON nudges(receiver_id, created_at DESC);
CREATE INDEX idx_nudges_unread ON nudges(receiver_id, read) WHERE read = false;

-- +goose Down
DROP TABLE nudges;
```

**Run migration:**
```bash
cd backend
goose -dir sql/migrations postgres "$DATABASE_URL" up
```

***

#### 2. SQL Queries

**Create `backend/sql/queries/nudges.sql`:**

```sql
-- name: CreateNudge :one
INSERT INTO nudges (group_id, sender_id, receiver_id, amount, message)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetMyNudges :many
SELECT 
    n.id,
    n.group_id,
    n.sender_id,
    n.receiver_id,
    n.amount,
    n.message,
    n.read,
    n.created_at,
    u.name AS sender_name,
    u.email AS sender_email,
    g.name AS group_name
FROM nudges n
JOIN users u ON u.id = n.sender_id
JOIN groups g ON g.id = n.group_id
WHERE n.receiver_id = $1
ORDER BY n.created_at DESC
LIMIT $2;

-- name: GetUnreadNudgeCount :one
SELECT COUNT(*) AS count
FROM nudges
WHERE receiver_id = $1 AND read = false;

-- name: MarkNudgeAsRead :exec
UPDATE nudges SET read = true WHERE id = $1;

-- name: MarkAllNudgesAsRead :exec
UPDATE nudges SET read = true WHERE receiver_id = $1 AND read = false;
```

**Generate sqlc code:**
```bash
cd backend
sqlc generate
```

***

#### 3. Backend Handler

**Update `backend/internal/handlers/nudge.go`:**

```go
package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NudgeHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

func NewNudgeHandler(pool *pgxpool.Pool, q *sqlcdb.Queries) *NudgeHandler {
	return &NudgeHandler{Pool: pool, Q: q}
}

type createNudgeRequest struct {
	DebtorID string  `json:"debtorId" binding:"required"`
	GroupID  string  `json:"groupId" binding:"required"`
	Amount   float64 `json:"amount" binding:"required,gt=0"`
	Message  string  `json:"message"`
}

type nudgeResponse struct {
	ID         string    `json:"id"`
	GroupID    string    `json:"groupId"`
	GroupName  string    `json:"groupName"`
	SenderID   string    `json:"senderId"`
	SenderName string    `json:"senderName"`
	Amount     float64   `json:"amount"`
	Message    string    `json:"message"`
	Read       bool      `json:"read"`
	CreatedAt  time.Time `json:"createdAt"`
}

// Create a nudge
func (h *NudgeHandler) Create(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	var req createNudgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	debtorID, err := uuid.Parse(req.DebtorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid debtor id"})
		return
	}

	groupID, err := uuid.Parse(req.GroupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Verify both users are in the group
	isMember, _ := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: sqlcutil.UUID(groupID),
		UserID:  sqlcutil.UUID(uid),
	})
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a group member"})
		return
	}

	isDebtorMember, _ := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: sqlcutil.UUID(groupID),
		UserID:  sqlcutil.UUID(debtorID),
	})
	if !isDebtorMember {
		c.JSON(http.StatusBadRequest, gin.H{"error": "debtor not in group"})
		return
	}

	// Create nudge
	message := req.Message
	if message == "" {
		message = "Hey! Just a friendly reminder about your pending payment 💸"
	}

	nudge, err := h.Q.CreateNudge(ctx, sqlcdb.CreateNudgeParams{
		GroupID:    sqlcutil.UUID(groupID),
		SenderID:   sqlcutil.UUID(uid),
		ReceiverID: sqlcutil.UUID(debtorID),
		Amount:     req.Amount,
		Message:    &message,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create nudge"})
		return
	}

	createdAt, _ := sqlcutil.Time(nudge.CreatedAt)
	c.JSON(http.StatusCreated, gin.H{
		"id":        sqlcutil.UUIDToString(nudge.ID),
		"message":   "Nudge sent!",
		"createdAt": createdAt,
	})
}

// Get my nudges
func (h *NudgeHandler) List(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.Q.GetMyNudges(ctx, sqlcdb.GetMyNudgesParams{
		ReceiverID: sqlcutil.UUID(uid),
		Limit:      50,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch nudges"})
		return
	}

	nudges := make([]nudgeResponse, 0, len(rows))
	for _, n := range rows {
		createdAt, _ := sqlcutil.Time(n.CreatedAt)
		senderName := ""
		if n.SenderName != nil && *n.SenderName != "" {
			senderName = *n.SenderName
		} else {
			senderName = n.SenderEmail
		}

		message := ""
		if n.Message != nil {
			message = *n.Message
		}

		nudges = append(nudges, nudgeResponse{
			ID:         sqlcutil.UUIDToString(n.ID),
			GroupID:    sqlcutil.UUIDToString(n.GroupID),
			GroupName:  n.GroupName,
			SenderID:   sqlcutil.UUIDToString(n.SenderID),
			SenderName: senderName,
			Amount:     n.Amount,
			Message:    message,
			Read:       n.Read,
			CreatedAt:  createdAt,
		})
	}

	c.JSON(http.StatusOK, nudges)
}

// Get unread count
func (h *NudgeHandler) UnreadCount(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	count, err := h.Q.GetUnreadNudgeCount(ctx, sqlcutil.UUID(uid))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// Mark as read
func (h *NudgeHandler) MarkRead(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	nudgeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid nudge id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.Q.MarkNudgeAsRead(ctx, sqlcutil.UUID(nudgeID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "marked as read"})
}

// Mark all as read
func (h *NudgeHandler) MarkAllRead(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.Q.MarkAllNudgesAsRead(ctx, sqlcutil.UUID(uid)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark all as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all nudges marked as read"})
}

func mustUserID(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(auth.CtxUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return uuid.Nil, false
	}
	s, _ := v.(string)
	uid, err := uuid.Parse(s)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return uuid.Nil, false
	}
	return uid, true
}
```

***

#### 4. Add Routes

**Update `backend/internal/server/router.go`:**

```go
// Nudges
nudgeHandler := handlers.NewNudgeHandler(deps.Pool, deps.Q)
api.POST("/nudges", nudgeHandler.Create)
api.GET("/nudges", nudgeHandler.List)
api.GET("/nudges/unread-count", nudgeHandler.UnreadCount)
api.PATCH("/nudges/:id/read", nudgeHandler.MarkRead)
api.POST("/nudges/mark-all-read", nudgeHandler.MarkAllRead)
```

***

#### 5. Frontend API

**Update `frontend/src/payup/api/endpoints.ts`:**

```typescript
export const api = {
  // ... existing methods

  // Nudges
  sendNudge(debtorId: string, groupId: string, amount: number, message?: string) {
    return apiRequest<{ id: string; message: string }>(`/v1/nudges`, {
      method: 'POST',
      body: JSON.stringify({ debtorId, groupId, amount, message })
    })
  },
  
  listNudges() {
    return apiRequest<Array<{
      id: string
      groupId: string
      groupName: string
      senderId: string
      senderName: string
      amount: number
      message: string
      read: boolean
      createdAt: string
    }>>(`/v1/nudges`)
  },
  
  getUnreadNudgeCount() {
    return apiRequest<{ count: number }>(`/v1/nudges/unread-count`)
  },
  
  markNudgeRead(nudgeId: string) {
    return apiRequest<void>(`/v1/nudges/${encodeURIComponent(nudgeId)}/read`, {
      method: 'PATCH'
    })
  },
  
  markAllNudgesRead() {
    return apiRequest<void>(`/v1/nudges/mark-all-read`, {
      method: 'POST'
    })
  },
}
```

***

#### 6. Update NotificationView

**Update `frontend/src/payup/components/NotificationView.tsx`:**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, X } from 'lucide-react'

import { api } from '../api/endpoints'
import type { Payment, User } from '../types'

type Nudge = {
  id: string
  groupId: string
  groupName: string
  senderId: string
  senderName: string
  amount: number
  message: string
  read: boolean
  createdAt: string
}

type Props = {
  payments: Payment[]
  currentUser: User
  activeUsers: User[]
  onReviewPayment: (paymentId: string, status: Payment['status']) => void
}

export function NotificationView({ payments, currentUser, activeUsers, onReviewPayment }: Props) {
  const qc = useQueryClient()
  
  // Fetch nudges
  const nudgesQuery = useQuery({
    queryKey: ['nudges'],
    queryFn: () => api.listNudges(),
  })

  const nudges = nudgesQuery.data || []
  const unreadNudges = nudges.filter(n => !n.read)

  const handleMarkRead = async (nudgeId: string) => {
    await api.markNudgeRead(nudgeId)
    await qc.invalidateQueries({ queryKey: ['nudges'] })
  }

  const handleMarkAllRead = async () => {
    await api.markAllNudgesRead()
    await qc.invalidateQueries({ queryKey: ['nudges'] })
  }

  const incomingPayments = payments.filter((p) => p.receiverId === currentUser.id && p.status === 'pending')
  const outgoingPayments = payments.filter((p) => p.senderId === currentUser.id && p.status === 'pending')

  const totalNotifications = incomingPayments.length + unreadNudges.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Mark All Read */}
      {unreadNudges.length > 0 && (
        <div className="flex justify-between items-center px-4">
          <p className="text-sm text-gray-400">
            {unreadNudges.length} unread nudge{unreadNudges.length > 1 ? 's' : ''}
          </p>
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-[#dfff4f] hover:underline flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </div>
      )}

      {/* Nudges Section */}
      {nudges.length > 0 && (
        <section className="bg-[#131316]/50 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-[#1c1c21]/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Bell className="text-orange-500" size={20} />
              <h3 className="text-sm font-bold text-white tracking-tight">Payment Reminders</h3>
            </div>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">FRIENDS NUDGING YOU</p>
          </div>

          <div className="p-6 space-y-4">
            {nudges.map((nudge) => (
              <NudgeItem
                key={nudge.id}
                nudge={nudge}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </section>
      )}

      {/* Existing Payment Approvals Section */}
      {incomingPayments.length > 0 && (
        <section className="bg-[#131316]/50 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-[#1c1c21]/50">
            <h3 className="text-sm font-bold text-white">Pending Approvals</h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">REVIEW & APPROVE PAYMENTS</p>
          </div>
          <div className="p-6 space-y-4">
            {incomingPayments.map((payment) => {
              const sender = activeUsers.find((u) => u.id === payment.senderId)
              if (!sender) return null
              return (
                <PaymentApprovalItem
                  key={payment.id}
                  payment={payment}
                  sender={sender}
                  onApprove={() => onReviewPayment(payment.id, 'approved')}
                  onReject={() => onReviewPayment(payment.id, 'rejected')}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Outgoing Payments */}
      {outgoingPayments.length > 0 && (
        <section className="bg-[#131316]/50 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-[#1c1c21]/50">
            <h3 className="text-sm font-bold text-white">Awaiting Approval</h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">YOUR PENDING PAYMENTS</p>
          </div>
          <div className="p-6 space-y-4">
            {outgoingPayments.map((payment) => {
              const receiver = activeUsers.find((u) => u.id === payment.receiverId)
              if (!receiver) return null
              return (
                <OutgoingPaymentItem key={payment.id} payment={payment} receiver={receiver} />
              )
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {totalNotifications === 0 && outgoingPayments.length === 0 && (
        <div className="bg-[#131316]/50 rounded-3xl border border-white/5 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 mx-auto text-gray-600">
            <Bell size={24} />
          </div>
          <p className="text-gray-400 font-bold mb-1">All Clear!</p>
          <p className="text-xs text-gray-600 font-mono">No pending notifications</p>
        </div>
      )}
    </div>
  )
}

function NudgeItem({ nudge, onMarkRead }: { nudge: Nudge; onMarkRead: (id: string) => void }) {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        nudge.read
          ? 'bg-[#0a0a0c] border-white/5 opacity-60'
          : 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-white">{nudge.senderName}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500 font-mono">{nudge.groupName}</span>
            {!nudge.read && (
              <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                New
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300">{nudge.message}</p>
        </div>
        {!nudge.read && (
          <button
            onClick={() => onMarkRead(nudge.id)}
            className="p-1.5 text-gray-500 hover:text-[#dfff4f] hover:bg-white/5 rounded-lg transition-colors"
            title="Mark as read"
          >
            <Check size={16} />
          </button>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="text-xs text-gray-500 font-mono">
          {new Date(nudge.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
        <div className="text-lg font-bold text-orange-500">
          ₱{nudge.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )
}

// ... rest of existing PaymentApprovalItem and OutgoingPaymentItem components
```

***

#### 7. Update PayUpApp

**Update nudge count in badge:**

```typescript
// Add nudge query
const nudgesQuery = useQuery({
  queryKey: ['nudges'],
  queryFn: () => api.listNudges(),
  enabled: activeTab === 'notifications',
})

const nudges = nudgesQuery.data || []
const unreadNudges = nudges.filter(n => !n.read)

// Update pending count
const pendingCount = 
  payments.filter((p) => p.receiverId === currentUser.id && p.status === 'pending').length +
  unreadNudges.length

// Update handleNudge
const handleNudge = async (userId: string, amount: number) => {
  if (!effectiveGroupId) return
  
  const user = activeUsers.find(u => u.id === userId)
  const userName = user?.name || 'your friend'
  
  if (!confirm(`Send a payment reminder to ${userName}?`)) return
  
  try {
    await api.sendNudge(userId, effectiveGroupId, amount)
    alert(`✅ Nudge sent!`)
  } catch (error: any) {
    alert(`❌ Failed: ${error.message}`)
  }
}
```

***

## ✅ Testing

### 1. Test Backend

```bash
cd backend
goose -dir sql/migrations postgres "$DATABASE_URL" up
sqlc generate
go run ./cmd/api
```

### 2. Test Nudge Flow

1. **User A** owes **User B** ₱500
2. **User B** logs in, clicks "Nudge" on User A
3. **User A** opens app → sees badge on Notifications tab
4. **User A** clicks Notifications → sees nudge from User B
5. **User A** clicks checkmark → nudge marked as read

***

## 📱 Phase 2: Web Push Notifications 

For mobile PWA notifications when app is closed, we can add Web Push later. For now, the in-app notifications work great!


Perfect! Let's add Web Push notifications for mobile. This will send notifications even when the app is closed.

***

## 📱 Web Push Notifications Implementation

### Phase 2: PWA Push Notifications

We'll use the **Web Push API** (free, no third-party service needed).

***

### 1. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install web-push
npm install -D @types/web-push
```

**Backend:**
```bash
cd backend
go get github.com/SherClockHolmes/webpush-go
```

***

### 2. Generate VAPID Keys

VAPID keys allow your server to send push notifications.

**Create a script: `backend/tools/generate-vapid.go`:**

```go
package main

import (
	"encoding/base64"
	"fmt"

	webpush "github.com/SherClockHolmes/webpush-go"
)

func main() {
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		panic(err)
	}

	fmt.Println("# Add these to your .env file:")
	fmt.Println()
	fmt.Printf("VAPID_PUBLIC_KEY=%s\n", publicKey)
	fmt.Printf("VAPID_PRIVATE_KEY=%s\n", privateKey)
	fmt.Println()
	fmt.Println("# Add public key to frontend .env:")
	fmt.Printf("VITE_VAPID_PUBLIC_KEY=%s\n", publicKey)
}
```

**Run it:**
```bash
cd backend
go run tools/generate-vapid.go
```

**Copy the output to `.env` files:**

`backend/.env`:
```env
# ... existing vars
VAPID_PUBLIC_KEY=BK7x...
VAPID_PRIVATE_KEY=fG8...
VAPID_SUBJECT=mailto:your-email@example.com
```

`frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_VAPID_PUBLIC_KEY=BK7x...  # Same as backend public key
```

***

### 3. Database Schema for Push Subscriptions

**Create `backend/sql/migrations/006_push_subscriptions.sql`:**

```sql
-- +goose Up
CREATE TABLE push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- +goose Down
DROP TABLE push_subscriptions;
```

**Run migration:**
```bash
cd backend
goose -dir sql/migrations postgres "$DATABASE_URL" up
```

***

### 4. SQL Queries for Push Subscriptions

**Create `backend/sql/queries/push_subscriptions.sql`:**

```sql
-- name: SavePushSubscription :exec
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, endpoint) DO UPDATE
SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth;

-- name: GetUserPushSubscriptions :many
SELECT endpoint, p256dh, auth
FROM push_subscriptions
WHERE user_id = $1;

-- name: DeletePushSubscription :exec
DELETE FROM push_subscriptions
WHERE user_id = $1 AND endpoint = $2;
```

**Generate:**
```bash
cd backend
sqlc generate
```

***

### 5. Backend Push Handler

**Create `backend/internal/handlers/push.go`:**

```go
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	webpush "github.com/SherClockHolmes/webpush-go"
)

type PushHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

func NewPushHandler(pool *pgxpool.Pool, q *sqlcdb.Queries) *PushHandler {
	return &PushHandler{Pool: pool, Q: q}
}

type subscribePushRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

// Subscribe to push notifications
func (h *PushHandler) Subscribe(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	var req subscribePushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.Q.SavePushSubscription(ctx, sqlcdb.SavePushSubscriptionParams{
		UserID:   sqlcutil.UUID(uid),
		Endpoint: req.Endpoint,
		P256dh:   req.Keys.P256dh,
		Auth:     req.Keys.Auth,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subscribed to push notifications"})
}

// Unsubscribe from push notifications
func (h *PushHandler) Unsubscribe(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	endpoint := c.Query("endpoint")
	if endpoint == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "endpoint required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.Q.DeletePushSubscription(ctx, sqlcdb.DeletePushSubscriptionParams{
		UserID:   sqlcutil.UUID(uid),
		Endpoint: endpoint,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unsubscribe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "unsubscribed"})
}

// Send push notification to a user
func SendPushToUser(ctx context.Context, q *sqlcdb.Queries, userID uuid.UUID, title, body, icon string) error {
	// Get user's subscriptions
	subs, err := q.GetUserPushSubscriptions(ctx, sqlcutil.UUID(userID))
	if err != nil {
		return err
	}

	vapidPublic := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	vapidSubject := os.Getenv("VAPID_SUBJECT")

	if vapidPublic == "" || vapidPrivate == "" {
		return nil // Push not configured, skip silently
	}

	// Prepare notification payload
	payload := map[string]interface{}{
		"title": title,
		"body":  body,
		"icon":  icon,
		"badge": "/badge-icon.png",
		"data": map[string]string{
			"url": "/app",
		},
	}

	payloadBytes, _ := json.Marshal(payload)

	// Send to all user's subscriptions
	for _, sub := range subs {
		subscription := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}

		_, err := webpush.SendNotification(payloadBytes, subscription, &webpush.Options{
			Subscriber:      vapidSubject,
			VAPIDPublicKey:  vapidPublic,
			VAPIDPrivateKey: vapidPrivate,
			TTL:             30,
		})

		// If subscription is invalid/expired, delete it
		if err != nil && webpush.IsNotFoundError(err) {
			_ = q.DeletePushSubscription(ctx, sqlcdb.DeletePushSubscriptionParams{
				UserID:   sqlcutil.UUID(userID),
				Endpoint: sub.Endpoint,
			})
		}
	}

	return nil
}
```

***

### 6. Update Nudge Handler to Send Push

**Update `backend/internal/handlers/nudge.go`:**

```go
// In Create() function, after creating nudge, add:

// Send push notification
go func() {
	pushCtx, pushCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer pushCancel()

	creditor, _ := h.Q.GetUser(pushCtx, uid)
	creditorName := "Someone"
	if creditor.Name != nil && *creditor.Name != "" {
		creditorName = *creditor.Name
	}

	_ = SendPushToUser(
		pushCtx,
		h.Q,
		debtorID,
		"💸 Payment Reminder",
		fmt.Sprintf("%s nudged you about ₱%.2f", creditorName, req.Amount),
		"/icon-192.png",
	)
}()
```

***

### 7. Add Routes

**Update `backend/internal/server/router.go`:**

```go
// Push notifications
pushHandler := handlers.NewPushHandler(deps.Pool, deps.Q)
api.POST("/push/subscribe", pushHandler.Subscribe)
api.DELETE("/push/unsubscribe", pushHandler.Unsubscribe)
```

***

### 8. Frontend: Service Worker

**Create `frontend/public/sw.js`:**

```javascript
// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-icon.png',
    vibrate: [200, 100, 200],
    tag: 'payup-notification',
    requireInteraction: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open PayUp' },
      { action: 'close', title: 'Dismiss' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data.url || '/app'
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus()
            }
          }
          // Otherwise open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen)
          }
        })
    )
  }
})

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
```

***

### 9. Frontend: Push Manager

**Create `frontend/src/lib/push/pushManager.ts`:**

```typescript
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const pushManager = {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Push notifications not supported')
    }
    return await Notification.requestPermission()
  },

  async subscribe(apiCall: (endpoint: string, keys: { p256dh: string; auth: string }) => Promise<void>) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported')
    }

    // Request permission
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Push notification permission denied')
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Subscribe to push
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured')
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    const subscriptionJSON = subscription.toJSON()
    
    // Send subscription to backend
    await apiCall(subscriptionJSON.endpoint!, {
      p256dh: subscriptionJSON.keys!.p256dh!,
      auth: subscriptionJSON.keys!.auth!
    })
  },

  async unsubscribe(apiCall: (endpoint: string) => Promise<void>) {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()
    await apiCall(subscription.endpoint)
  },

  async isSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  }
}
```

***

### 10. Frontend: API Endpoints

**Update `frontend/src/payup/api/endpoints.ts`:**

```typescript
// Push notifications
subscribePush(endpoint: string, keys: { p256dh: string; auth: string }) {
  return apiRequest<{ message: string }>(`/v1/push/subscribe`, {
    method: 'POST',
    body: JSON.stringify({ endpoint, keys })
  })
},

unsubscribePush(endpoint: string) {
  return apiRequest<void>(`/v1/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
    method: 'DELETE'
  })
},
```

***

### 11. Frontend: Push Settings UI

**Create `frontend/src/payup/components/modals/PushNotificationPrompt.tsx`:**

```typescript
import { useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { pushManager } from '@/lib/push/pushManager'
import { api } from '@/payup/api/endpoints'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function PushNotificationPrompt({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  const handleEnable = async () => {
    setLoading(true)
    try {
      await pushManager.subscribe((endpoint, keys) => api.subscribePush(endpoint, keys))
      alert('✅ Push notifications enabled!')
      onClose()
    } catch (error: any) {
      alert(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Bell className="text-[#dfff4f]" size={24} />
            Enable Notifications
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#dfff4f]/10 flex items-center justify-center">
            <Bell size={40} className="text-[#dfff4f]" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-2">Stay Updated!</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Get instant notifications when friends nudge you about payments, 
              even when the app is closed.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full bg-[#dfff4f] text-black font-bold py-4 rounded-xl hover:bg-[#ccee3e] transition-colors disabled:opacity-50"
            >
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-gray-600">
            You can change this anytime in settings
          </p>
        </div>
      </div>
    </div>
  )
}
```

***

### 12. Add Push Prompt to App

**Update `frontend/src/payup/PayUpApp.tsx`:**

```typescript
import { useEffect, useState } from 'react'
import { PushNotificationPrompt } from './components/modals/PushNotificationPrompt'
import { pushManager } from '@/lib/push/pushManager'

export function PayUpApp() {
  // ... existing state
  const [isPushPromptOpen, setIsPushPromptOpen] = useState(false)

  // Check if should prompt for push permissions
  useEffect(() => {
    const checkPushPermission = async () => {
      if (!('Notification' in window)) return
      
      const permission = Notification.permission
      const isSubscribed = await pushManager.isSubscribed()
      
      // Prompt if permission not asked yet and not subscribed
      if (permission === 'default' && !isSubscribed) {
        // Show prompt after 5 seconds
        setTimeout(() => setIsPushPromptOpen(true), 5000)
      }
    }

    checkPushPermission()
  }, [])

  return (
    <>
      {/* ... existing app code */}

      {/* Push Notification Prompt */}
      <PushNotificationPrompt
        isOpen={isPushPromptOpen}
        onClose={() => setIsPushPromptOpen(false)}
      />
    </>
  )
}
```

***

### 13. Add Icon Files

**Create notification icons in `frontend/public/`:**

- `icon-192.png` (192x192px PayUp logo)
- `icon-512.png` (512x512px PayUp logo)
- `badge-icon.png` (96x96px monochrome badge)

You can use a simple yellow circle with "P" for now.

***

### 14. Update vite.config.ts

**Ensure service worker is copied:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  publicDir: 'public', // Ensures sw.js is copied
})
```

***

## ✅ Testing Push Notifications

### 1. Test on Desktop

```bash
# Backend
cd backend
go run ./cmd/api

# Frontend
cd frontend
npm run dev
```

1. Open http://localhost:5173
2. Login
3. Wait 5 seconds for push prompt
4. Click "Enable Notifications"
5. Allow browser permission
6. Have another user nudge you
7. Close the browser tab
8. You should get a desktop notification!

***

### 2. Test on Mobile (PWA)

**iOS (Safari):**
1. Open app in Safari
2. Tap Share → Add to Home Screen
3. Open PWA from home screen
4. Enable notifications when prompted
5. Close PWA
6. Get nudged → Should see notification

**Android (Chrome):**
1. Open app in Chrome
2. Tap "Install App" banner
3. Enable notifications
4. Close app
5. Get nudged → Should see notification

***

## 🔒 Security Notes

1. **VAPID Keys** - Keep private key secret (never commit to git)
2. **HTTPS Required** - Push only works on HTTPS (localhost is OK for dev)
3. **User Control** - Always allow users to disable notifications
4. **Rate Limiting** - Already have rate limiting on nudge endpoint ✅

***

## 📊 Complete Flow

1. **User B** clicks "Nudge" on User A
2. **Backend:**
   - Creates nudge record in DB
   - Sends push notification to User A's subscribed devices
3. **User A's Device:**
   - Shows system notification (even if app closed)
   - Clicking opens PayUp app
   - Badge shows unread count
4. **User A** opens app:
   - Sees nudge in Notifications tab
   - Marks as read → badge decreases

***

## 🎯 Final Checklist

- [ ] VAPID keys generated and in `.env`
- [ ] Database migrated (push_subscriptions table)
- [ ] Service worker registered (`/sw.js`)
- [ ] Icons created (`icon-192.png`, etc.)
- [ ] Push permission requested on first app load
- [ ] Nudge sends push notification
- [ ] Notification opens app when clicked
- [ ] Test on mobile PWA

***


