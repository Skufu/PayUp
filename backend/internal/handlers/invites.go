package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InvitesHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

type invitePreviewResponse struct {
	GroupID         string     `json:"groupId"`
	GroupName       string     `json:"groupName"`
	MemberCount     int64      `json:"memberCount"`
	CreatedByName   *string    `json:"createdByName,omitempty"`
	CreatedByAvatar *string    `json:"createdByAvatar,omitempty"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	IsValid         bool       `json:"isValid"`
	InvalidReason   string     `json:"invalidReason,omitempty"`
}

// Preview returns invite info for displaying a preview page before joining.
// This endpoint is public (no auth required).
func (h *InvitesHandler) Preview(c *gin.Context) {
	code := strings.TrimSpace(strings.ToUpper(c.Param("code")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	inv, err := h.Q.GetInvitePreview(ctx, code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invalid invite"})
		return
	}

	resp := invitePreviewResponse{
		GroupID:         sqlcutil.UUIDToString(inv.GroupID),
		GroupName:       inv.GroupName,
		MemberCount:     inv.MemberCount,
		CreatedByName:   inv.CreatedByName,
		CreatedByAvatar: inv.CreatedByAvatar,
		IsValid:         true,
	}

	// Convert expiry
	if inv.ExpiresAt.Valid {
		resp.ExpiresAt = &inv.ExpiresAt.Time
	}

	// Check if expired
	if inv.ExpiresAt.Valid && inv.ExpiresAt.Time.Before(time.Now()) {
		resp.IsValid = false
		resp.InvalidReason = "This invite has expired"
	}

	// Check if max uses reached
	if inv.MaxUses != nil && inv.UseCount >= *inv.MaxUses {
		resp.IsValid = false
		resp.InvalidReason = "This invite has reached its maximum uses"
	}

	c.JSON(http.StatusOK, resp)
}

// StartCleanupJob runs a background goroutine that periodically cleans up
// expired and exhausted invites. Call this once at server startup.
func StartInviteCleanupJob(pool *pgxpool.Pool, q *sqlcdb.Queries) {
	if pool == nil || q == nil {
		return
	}
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		// Run once immediately
		runCleanup(q)

		for range ticker.C {
			runCleanup(q)
		}
	}()

	logger.Info("Invite cleanup job started (runs every hour)")
}

func runCleanup(q *sqlcdb.Queries) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := q.DeleteExpiredInvites(ctx); err != nil {
		logger.Error("Failed to cleanup expired invites", logger.Fields{"error": err.Error()})
	} else {
		logger.Debug("Invite cleanup completed", nil)
	}
}
