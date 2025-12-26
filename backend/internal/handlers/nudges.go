package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NudgesHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

type createNudgeRequest struct {
	DebtorID string  `json:"debtorId"`
	GroupID  string  `json:"groupId"`
	Amount   float64 `json:"amount"`
	Message  *string `json:"message"`
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

func (h *NudgesHandler) Create(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	var req createNudgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	debtorID, err := uuid.Parse(req.DebtorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid debtorId"})
		return
	}
	if debtorID == uid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot nudge yourself"})
		return
	}

	groupUUID, err := uuid.Parse(req.GroupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid groupId"})
		return
	}
	groupID := sqlcutil.UUID(groupUUID)

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be > 0"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()

	// Authz: both users must be group members.
	memberSet, err := groupMemberSet(ctx, h.Q, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send nudge"})
		return
	}
	if !memberSet[uid] || !memberSet[debtorID] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "both users must be group members"})
		return
	}

	msg := ""
	if req.Message != nil {
		msg = strings.TrimSpace(*req.Message)
	}
	if msg == "" {
		msg = "Hey! Just a friendly reminder about your pending payment 💸"
	}

	amountStr := util.CentsToMoneyString(util.MoneyToCents(req.Amount))
	nudge, err := h.Q.CreateNudge(ctx, sqlcdb.CreateNudgeParams{
		GroupID:    groupID,
		SenderID:   sqlcutil.UUID(uid),
		ReceiverID: sqlcutil.UUID(debtorID),
		Amount:     amountStr,
		Message:    &msg,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send nudge"})
		return
	}

	// Fire-and-forget push notification (if configured)
	go func(sender uuid.UUID, receiver uuid.UUID, amount float64) {
		pushCtx, pushCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer pushCancel()

		senderName := "Someone"
		if u, err := h.Q.GetUserByID(pushCtx, sqlcutil.UUID(sender)); err == nil {
			if u.Name != nil && strings.TrimSpace(*u.Name) != "" {
				senderName = strings.TrimSpace(*u.Name)
			} else {
				senderName = u.Email
			}
		}

		_ = SendPushToUser(
			pushCtx,
			h.Q,
			receiver,
			"💸 Payment Reminder",
			senderName+" nudged you about ₱"+util.CentsToMoneyString(util.MoneyToCents(amount)),
		)
	}(uid, debtorID, req.Amount)

	createdAt, _ := sqlcutil.Time(nudge.CreatedAt)
	c.JSON(http.StatusCreated, gin.H{
		"id":        sqlcutil.UUIDToString(nudge.ID),
		"message":   "nudge sent",
		"createdAt": createdAt,
	})
}

func (h *NudgesHandler) ListMine(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()

	rows, err := h.Q.ListNudgesForReceiver(ctx, sqlcdb.ListNudgesForReceiverParams{
		ReceiverID: sqlcutil.UUID(uid),
		Limit:      50,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list nudges"})
		return
	}

	out := make([]nudgeResponse, 0, len(rows))
	for _, n := range rows {
		createdAt, _ := sqlcutil.Time(n.CreatedAt)
		senderName := n.SenderEmail
		if n.SenderName != nil && strings.TrimSpace(*n.SenderName) != "" {
			senderName = strings.TrimSpace(*n.SenderName)
		}
		msg := ""
		if n.Message != nil {
			msg = *n.Message
		}

		out = append(out, nudgeResponse{
			ID:         sqlcutil.UUIDToString(n.ID),
			GroupID:    sqlcutil.UUIDToString(n.GroupID),
			GroupName:  n.GroupName,
			SenderID:   sqlcutil.UUIDToString(n.SenderID),
			SenderName: senderName,
			Amount:     util.MustMoneyToFloat(n.Amount),
			Message:    msg,
			Read:       n.Read,
			CreatedAt:  createdAt,
		})
	}

	c.JSON(http.StatusOK, out)
}

func (h *NudgesHandler) UnreadCount(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	count, err := h.Q.GetUnreadNudgeCount(ctx, sqlcutil.UUID(uid))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *NudgesHandler) MarkRead(c *gin.Context) {
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

	if err := h.Q.MarkNudgeAsRead(ctx, sqlcdb.MarkNudgeAsReadParams{
		ID:         sqlcutil.UUID(nudgeID),
		ReceiverID: sqlcutil.UUID(uid),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func (h *NudgesHandler) MarkAllRead(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.Q.MarkAllNudgesAsRead(ctx, sqlcutil.UUID(uid)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark all read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}
