package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type subscribePushRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

type PushHandler struct {
	Q *sqlcdb.Queries
}

func (h *PushHandler) Subscribe(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	var req subscribePushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subscription"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.Q.SavePushSubscription(ctx, sqlcdb.SavePushSubscriptionParams{
		UserID:   sqlcutil.UUID(uid),
		Endpoint: req.Endpoint,
		P256dh:   req.Keys.P256dh,
		Auth:     req.Keys.Auth,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subscribed"})
}

func (h *PushHandler) Unsubscribe(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	endpoint := c.Query("endpoint")
	if endpoint == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "endpoint is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.Q.DeletePushSubscription(ctx, sqlcdb.DeletePushSubscriptionParams{
		UserID:   sqlcutil.UUID(uid),
		Endpoint: endpoint,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unsubscribe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "unsubscribed"})
}

// SendPushToUser sends a push notification to all of the user's stored subscriptions.
// If VAPID env vars aren't configured, it no-ops.
func SendPushToUser(ctx context.Context, q *sqlcdb.Queries, userID uuid.UUID, title string, body string) error {
	vapidPublic := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidPublic == "" || vapidPrivate == "" || vapidSubject == "" {
		// Push not configured.
		return nil
	}

	subs, err := q.ListPushSubscriptionsForUser(ctx, sqlcutil.UUID(userID))
	if err != nil {
		return err
	}
	if len(subs) == 0 {
		return nil
	}

	payloadBytes, _ := json.Marshal(map[string]any{
		"title": title,
		"body":  body,
		"icon":  "/vite.svg",
		"data": map[string]string{
			"url": "/",
		},
	})

	for _, sub := range subs {
		s := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}

		resp, err := webpush.SendNotification(payloadBytes, s, &webpush.Options{
			Subscriber:      vapidSubject,
			VAPIDPublicKey:  vapidPublic,
			VAPIDPrivateKey: vapidPrivate,
			TTL:             30,
		})
		if resp != nil {
			_ = resp.Body.Close()
		}
		// Remove dead subscriptions.
		if resp != nil && (resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone) {
			_ = q.DeletePushSubscription(ctx, sqlcdb.DeletePushSubscriptionParams{
				UserID:   sqlcutil.UUID(userID),
				Endpoint: sub.Endpoint,
			})
			continue
		}
		// Ignore single-subscription errors; others may still succeed.
		_ = err
	}

	return nil
}
