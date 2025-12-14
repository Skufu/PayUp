package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentsHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries

	UploadService *services.UploadService
}

type createPaymentRequest struct {
	GroupID    string  `json:"groupId"`
	ReceiverID string  `json:"receiverId"`
	Amount     float64 `json:"amount"`
	ProofURL   *string `json:"proofUrl"`
}

func (h *PaymentsHandler) Create(c *gin.Context) {
	uidStr, ok := c.Get(auth.CtxUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	senderID, err := uuid.Parse(uidStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req createPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	groupID, err := uuid.Parse(req.GroupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid groupId"})
		return
	}
	gid := sqlcutil.UUID(groupID)
	receiverID, err := uuid.Parse(req.ReceiverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiverId"})
		return
	}
	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be > 0"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()

	// Validate both are members of the group.
	memberSet, err := groupMemberSet(ctx, h.Q, gid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create payment"})
		return
	}
	if !memberSet[senderID] || !memberSet[receiverID] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "both users must be group members"})
		return
	}

	amountCents := moneyToCents(req.Amount)
	proof := strings.TrimSpace(deref(req.ProofURL))
	var proofPtr *string
	if proof != "" {
		proofPtr = &proof
	}

	created, err := h.Q.CreatePayment(ctx, sqlcdb.CreatePaymentParams{
		GroupID:    gid,
		SenderID:   sqlcutil.UUID(senderID),
		ReceiverID: sqlcutil.UUID(receiverID),
		Amount:     centsToMoneyString(amountCents),
		ProofUrl:   proofPtr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create payment"})
		return
	}

	createdAt, _ := sqlcutil.Time(created.CreatedAt)
	c.JSON(http.StatusCreated, gin.H{
		"id":         sqlcutil.UUIDToString(created.ID),
		"groupId":    groupID.String(),
		"senderId":   senderID.String(),
		"receiverId": receiverID.String(),
		"amount":     float64(amountCents) / 100,
		"status":     string(sqlcdb.PaymentStatusPending),
		"createdAt":  createdAt,
	})
}

func (h *PaymentsHandler) List(c *gin.Context) {
	uidStr, ok := c.Get(auth.CtxUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	uid, err := uuid.Parse(uidStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	status := strings.TrimSpace(c.Query("status"))
	if status == "" {
		status = "pending"
	}
	var st sqlcdb.PaymentStatus
	switch status {
	case "pending":
		st = sqlcdb.PaymentStatusPending
	case "approved":
		st = sqlcdb.PaymentStatusApproved
	case "rejected":
		st = sqlcdb.PaymentStatusRejected
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()

	rows, err := h.Q.ListPaymentsForReceiverByStatus(ctx, sqlcdb.ListPaymentsForReceiverByStatusParams{
		ReceiverID: sqlcutil.UUID(uid),
		Status:     st,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list payments"})
		return
	}

	out := make([]gin.H, 0, 32)
	for _, p := range rows {
		createdAt, _ := sqlcutil.Time(p.CreatedAt)
		out = append(out, gin.H{
			"id":         sqlcutil.UUIDToString(p.ID),
			"groupId":    sqlcutil.UUIDToString(p.GroupID),
			"senderId":   sqlcutil.UUIDToString(p.SenderID),
			"receiverId": sqlcutil.UUIDToString(p.ReceiverID),
			"amount":     mustMoneyToFloat(p.Amount),
			"status":     string(p.Status),
			"proofUrl":   p.ProofUrl,
			"createdAt":  createdAt,
		})
	}

	c.JSON(http.StatusOK, out)
}

func (h *PaymentsHandler) Approve(c *gin.Context) {
	h.review(c, sqlcdb.PaymentStatusApproved)
}

func (h *PaymentsHandler) Reject(c *gin.Context) {
	h.review(c, sqlcdb.PaymentStatusRejected)
}

func (h *PaymentsHandler) review(c *gin.Context, newStatus sqlcdb.PaymentStatus) {
	uidStr, ok := c.Get(auth.CtxUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	uid, err := uuid.Parse(uidStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	paymentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update payment"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := sqlcdb.New(tx)

	p, err := qtx.GetPaymentForUpdate(ctx, sqlcutil.UUID(paymentID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	receiverUUID, _ := sqlcutil.UUIDToUUID(p.ReceiverID)
	if receiverUUID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	if p.Status != sqlcdb.PaymentStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment is not pending"})
		return
	}

	now := time.Now().UTC()
	if err := qtx.UpdatePaymentDecision(ctx, sqlcdb.UpdatePaymentDecisionParams{
		ID:        p.ID,
		Status:    newStatus,
		DecidedBy: sqlcutil.UUID(uid),
		DecidedAt: sqlcutil.Timestamptz(now),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update payment"})
		return
	}

	// On approve: create a transfer-type expense to update balances (prototype behavior).
	if newStatus == sqlcdb.PaymentStatusApproved {
		expenseID, err := qtx.CreateTransferExpense(ctx, sqlcdb.CreateTransferExpenseParams{
			GroupID:   p.GroupID,
			Title:     "Settlement Verified",
			Amount:    p.Amount,
			PayerID:   p.SenderID,
			CreatedBy: sqlcutil.UUID(uid),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to settle payment"})
			return
		}

		if err := qtx.CreateExpenseSplit(ctx, sqlcdb.CreateExpenseSplitParams{
			ExpenseID: expenseID,
			UserID:    p.ReceiverID,
			Amount:    p.Amount,
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to settle payment"})
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update payment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": string(newStatus)})
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (h *PaymentsHandler) UploadProof(c *gin.Context) {
	_, ok := mustUserID(c)
	if !ok {
		return
	}

	file, header, err := c.Request.FormFile("proof")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
		return
	}
	defer file.Close()

	if h.UploadService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "upload service not available"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	proofID := uuid.NewString()
	url, err := h.UploadService.UploadPaymentProof(ctx, file, header.Filename, proofID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "upload failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"proofUrl": url})
}
