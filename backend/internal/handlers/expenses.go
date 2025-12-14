package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExpensesHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

type expenseResponse struct {
	ID        string             `json:"id"`
	GroupID   string             `json:"groupId"`
	Title     string             `json:"title"`
	Amount    float64            `json:"amount"`
	PayerID   string             `json:"payerId"`
	Mode      *string            `json:"mode,omitempty"`
	Type      *string            `json:"type,omitempty"`
	Splits    map[string]float64 `json:"splits"`
	CreatedAt time.Time          `json:"createdAt"`
}

type createExpenseRequest struct {
	Title   string             `json:"title"`
	Amount  float64            `json:"amount"`
	PayerID string             `json:"payerId"`
	Mode    *string            `json:"mode"`
	Type    *string            `json:"type"`
	Splits  map[string]float64 `json:"splits"`
}

func (h *ExpensesHandler) ListByGroup(c *gin.Context) {
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

	gid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	groupID := sqlcutil.UUID(gid)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Authz: must be a group member.
	isMember, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	rows, err := h.Q.ListExpensesByGroup(ctx, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list expenses"})
		return
	}

	out := make([]expenseResponse, 0, 32)
	for _, row := range rows {
		var splits map[string]float64
		if err := json.Unmarshal([]byte(row.Splits), &splits); err != nil {
			splits = map[string]float64{}
		}
		createdAt, _ := sqlcutil.Time(row.CreatedAt)
		out = append(out, expenseResponse{
			ID:        sqlcutil.UUIDToString(row.ID),
			GroupID:   sqlcutil.UUIDToString(row.GroupID),
			Title:     row.Title,
			Amount:    mustMoneyToFloat(row.Amount),
			PayerID:   sqlcutil.UUIDToString(row.PayerID),
			Mode:      row.Mode,
			Type:      row.Type,
			Splits:    splits,
			CreatedAt: createdAt,
		})
	}

	c.JSON(http.StatusOK, out)
}

func (h *ExpensesHandler) CreateForGroup(c *gin.Context) {
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

	gid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	groupID := sqlcutil.UUID(gid)

	var req createExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be > 0"})
		return
	}
	amountCents := moneyToCents(req.Amount)

	payerID, err := uuid.Parse(req.PayerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payerId"})
		return
	}

	if len(req.Splits) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "splits is required"})
		return
	}

	splitUserIDs := make([]uuid.UUID, 0, len(req.Splits))
	splitsCents := make(map[uuid.UUID]int64, len(req.Splits))
	var sum int64
	for k, v := range req.Splits {
		uid2, err := uuid.Parse(k)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid splits userId"})
			return
		}
		if v < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "split amount must be >= 0"})
			return
		}
		cents := moneyToCents(v)
		splitUserIDs = append(splitUserIDs, uid2)
		splitsCents[uid2] = cents
		sum += cents
	}
	if sum != amountCents {
		c.JSON(http.StatusBadRequest, gin.H{"error": "splits must sum to amount"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()

	// Authz: current user must be a member; payer and split users must be members too.
	memberSet, err := groupMemberSet(ctx, h.Q, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to validate members"})
		return
	}
	if !memberSet[uid] {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	if !memberSet[payerID] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payer must be a group member"})
		return
	}
	for _, sid := range splitUserIDs {
		if !memberSet[sid] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "split users must be group members"})
			return
		}
	}

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create expense"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := sqlcdb.New(tx)
	amountStr := centsToMoneyString(amountCents)
	created, err := qtx.CreateExpense(ctx, sqlcdb.CreateExpenseParams{
		GroupID:   groupID,
		Title:     title,
		Amount:    amountStr,
		PayerID:   sqlcutil.UUID(payerID),
		Mode:      req.Mode,
		Type:      req.Type,
		CreatedBy: sqlcutil.UUID(uid),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create expense"})
		return
	}

	// Deterministic insert order
	keys := make([]uuid.UUID, 0, len(splitsCents))
	for k := range splitsCents {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i].String() < keys[j].String() })

	for _, sid := range keys {
		if err := qtx.CreateExpenseSplit(ctx, sqlcdb.CreateExpenseSplitParams{
			ExpenseID: created.ID,
			UserID:    sqlcutil.UUID(sid),
			Amount:    centsToMoneyString(splitsCents[sid]),
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create splits"})
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create expense"})
		return
	}

	// Return payload close to the prototype shape.
	outSplits := make(map[string]float64, len(splitsCents))
	for sid, cents := range splitsCents {
		outSplits[sid.String()] = float64(cents) / 100
	}

	createdAt, _ := sqlcutil.Time(created.CreatedAt)
	c.JSON(http.StatusCreated, expenseResponse{
		ID:        sqlcutil.UUIDToString(created.ID),
		GroupID:   gid.String(),
		Title:     title,
		Amount:    float64(amountCents) / 100,
		PayerID:   payerID.String(),
		Mode:      req.Mode,
		Type:      req.Type,
		Splits:    outSplits,
		CreatedAt: createdAt,
	})
}

func (h *ExpensesHandler) Delete(c *gin.Context) {
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

	eid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expense id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	row, err := h.Q.GetExpenseForDelete(ctx, sqlcutil.UUID(eid))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Must be member.
	isMember, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: row.GroupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	payerUUID, _ := sqlcutil.UUIDToUUID(row.PayerID)
	allowed := payerUUID == uid
	if createdUUID, ok := sqlcutil.UUIDToUUID(row.CreatedBy); ok && createdUUID == uid {
		allowed = true
	}
	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err := h.Q.DeleteExpense(ctx, row.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete"})
		return
	}

	c.Status(http.StatusNoContent)
}

func groupMemberSet(ctx context.Context, q *sqlcdb.Queries, groupID pgtype.UUID) (map[uuid.UUID]bool, error) {
	ids, err := q.ListGroupMemberIDs(ctx, groupID)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		if u, ok := sqlcutil.UUIDToUUID(id); ok {
			out[u] = true
		}
	}
	return out, nil
}

func moneyToCents(v float64) int64 {
	return int64(math.Round(v * 100))
}

func centsToMoneyString(cents int64) string {
	return fmt.Sprintf("%.2f", float64(cents)/100)
}

func mustMoneyToFloat(s string) float64 {
	// numeric scanned as string from pgx; keep it simple.
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return f
}
