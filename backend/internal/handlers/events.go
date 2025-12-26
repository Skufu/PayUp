package handlers

import (
	"io"
	"net/http"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/events"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// EventsHandler handles SSE connections for real-time updates
type EventsHandler struct {
	Hub    *events.Hub
	Issuer auth.Issuer
	Q      *sqlcdb.Queries
}

// Stream handles SSE connections for a group
// GET /v1/groups/:id/events?token=<jwt>
//
// NOTE: EventSource API doesn't support Authorization headers,
// so we pass the token as a query parameter instead.
func (h *EventsHandler) Stream(c *gin.Context) {
	groupID := c.Param("id")

	// Validate JWT from query param (EventSource can't set headers)
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
		return
	}

	userID, err := h.Issuer.Parse(token, "access")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	// Verify user is member of group
	groupUUID, err := uuid.Parse(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	// Check group membership
	isMember, err := h.Q.IsGroupMember(c.Request.Context(), sqlcdb.IsGroupMemberParams{
		GroupID: sqlcutil.UUID(groupUUID),
		UserID:  sqlcutil.UUID(userUUID),
	})
	if err != nil || !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this group"})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	// Subscribe to group events
	ch := h.Hub.Subscribe(groupID)
	defer h.Hub.Unsubscribe(groupID, ch)

	// Flush headers immediately
	c.Writer.Flush()

	// Stream events
	c.Stream(func(w io.Writer) bool {
		select {
		case event, ok := <-ch:
			if !ok {
				return false
			}
			c.SSEvent("message", event)
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}
