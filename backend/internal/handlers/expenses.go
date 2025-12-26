package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/events"
	"github.com/Skufu/PayUp/internal/logger"
	"github.com/Skufu/PayUp/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)


type ExpensesHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
	Hub  *events.Hub
}

type expenseResponse struct {
	ID        string             `json:"id"`
	GroupID   string             `json:"groupId"`
	Title     string             `json:"title"`
	Amount    float64            `json:"amount"`
	PayerID   string             `json:"payerId"`
	Mode      *string            `json:"mode,omitempty"`
	Type      *string            `json:"type,omitempty"`
	Category  *string            `json:"category,omitempty"`
	Splits    map[string]float64 `json:"splits"`
	CreatedAt time.Time          `json:"createdAt"`
}

type createExpenseRequest struct {
	Title   string             `json:"title"`
	Amount  float64            `json:"amount"`
	PayerID string             `json:"payerId"`
	Mode     *string            `json:"mode"`
	Type     *string            `json:"type"`
	Category *string            `json:"category"`
	Splits   map[string]float64 `json:"splits"`
}

func (h *ExpensesHandler) ListByGroup(c *gin.Context) {
	uid, ok := util.MustUserID(c)
	if !ok {
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
		logger.DBError("ListExpensesByGroup", err, logger.Fields{"group_id": gid.String()})
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
			Amount:    util.MustMoneyToFloat(row.Amount),
			PayerID:   sqlcutil.UUIDToString(row.PayerID),
			Category:  row.Category,
			Splits:    splits,
			CreatedAt: createdAt,
		})
	}

	c.JSON(http.StatusOK, out)
}

func (h *ExpensesHandler) CreateForGroup(c *gin.Context) {
	uid, ok := util.MustUserID(c)
	if !ok {
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
	if err := ValidateTitle(title); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ValidateAmount(req.Amount); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	amountCents := util.MoneyToCents(req.Amount)

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
		cents := util.MoneyToCents(v)
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
		logger.DBError("groupMemberSet", err, logger.Fields{"group_id": gid.String()})
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
		logger.DBError("BeginTx", err, logger.Fields{"operation": "CreateExpense"})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create expense"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := sqlcdb.New(tx)
	amountStr := util.CentsToMoneyString(amountCents)
	created, err := qtx.CreateExpense(ctx, sqlcdb.CreateExpenseParams{
		GroupID:   groupID,
		Title:     title,
		Amount:    amountStr,
		PayerID:   sqlcutil.UUID(payerID),
		Mode:      req.Mode,
		Type:      req.Type,
		Category:  req.Category,
		CreatedBy: sqlcutil.UUID(uid),
	})
	if err != nil {
		logger.DBError("CreateExpense", err, logger.Fields{"group_id": gid.String(), "title": title})
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
			Amount:    util.CentsToMoneyString(splitsCents[sid]),
		}); err != nil {
			logger.DBError("CreateExpenseSplit", err, logger.Fields{"expense_id": sqlcutil.UUIDToString(created.ID)})
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create splits"})
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		logger.DBError("CommitTx", err, logger.Fields{"operation": "CreateExpense"})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create expense"})
		return
	}

	// Return payload close to the prototype shape.
	outSplits := make(map[string]float64, len(splitsCents))
	for sid, cents := range splitsCents {
		outSplits[sid.String()] = util.CentsToFloat(cents)
	}

	createdAt, _ := sqlcutil.Time(created.CreatedAt)
	resp := expenseResponse{
		ID:        sqlcutil.UUIDToString(created.ID),
		GroupID:   gid.String(),
		Title:     title,
		Amount:    util.CentsToFloat(amountCents),
		PayerID:   payerID.String(),
		Mode:      created.Mode,
		Type:      created.Type,
		Category:  created.Category,
		Splits:    outSplits,
		CreatedAt: createdAt,
	}

	// Log activity
	_ = LogActivity(ctx, h.Q, groupID, uid, "expense_created", fmt.Sprintf("An expense was added: %s", req.Title), nil)

	// Emit SSE event
	if h.Hub != nil {
		h.Hub.Broadcast(gid.String(), events.Event{
			Type:    events.ExpenseCreated,
			GroupID: gid.String(),
		})
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *ExpensesHandler) Update(c *gin.Context) {
	uid, ok := util.MustUserID(c)
	if !ok {
		return
	}

	eid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expense id"})
		return
	}

	var req createExpenseRequest // Reuse create request shape
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if err := ValidateTitle(title); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ValidateAmount(req.Amount); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	amountCents := util.MoneyToCents(req.Amount)

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
		cents := util.MoneyToCents(v)
		splitUserIDs = append(splitUserIDs, uid2)
		splitsCents[uid2] = cents
		sum += cents
	}
	if sum != amountCents {
		c.JSON(http.StatusBadRequest, gin.H{"error": "splits must sum to amount"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Get existing expense to check permissions and group
	row, err := h.Q.GetExpenseForDelete(ctx, sqlcutil.UUID(eid))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Permission: payer or creator
	payerUUID, _ := sqlcutil.UUIDToUUID(row.PayerID)
	allowed := payerUUID == uid
	if createdUUID, ok := sqlcutil.UUIDToUUID(row.CreatedBy); ok && createdUUID == uid {
		allowed = true
	}
	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// Validate members in group
	memberSet, err := groupMemberSet(ctx, h.Q, row.GroupID)
	if err != nil {
		logger.DBError("groupMemberSet", err, logger.Fields{"expense_id": eid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to validate members"})
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
		logger.DBError("BeginTx", err, logger.Fields{"operation": "UpdateExpense"})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update expense"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := sqlcdb.New(tx)

	// 1. Update expense basic info
	updatedRow, err := qtx.UpdateExpense(ctx, sqlcdb.UpdateExpenseParams{
		ID:       row.ID,
		Title:    title,
		Amount:   util.CentsToMoneyString(amountCents),
		PayerID:  sqlcutil.UUID(payerID),
		Mode:     req.Mode,
		Type:     req.Type,
		Category: req.Category,
	})
	if err != nil {
		logger.DBError("UpdateExpense", err, logger.Fields{"expense_id": eid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update expense"})
		return
	}

	// 2. Clear and recreate splits
	if err := qtx.DeleteExpenseSplits(ctx, row.ID); err != nil {
		logger.DBError("DeleteExpenseSplits", err, logger.Fields{"expense_id": eid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update splits"})
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
			ExpenseID: row.ID,
			UserID:    sqlcutil.UUID(sid),
			Amount:    util.CentsToMoneyString(splitsCents[sid]),
		}); err != nil {
			logger.DBError("CreateExpenseSplit", err, logger.Fields{"expense_id": eid.String()})
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create splits"})
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update expense"})
		return
	}

	outSplits := make(map[string]float64, len(splitsCents))
	for sid, cents := range splitsCents {
		outSplits[sid.String()] = util.CentsToFloat(cents)
	}

	resp := expenseResponse{
		ID:       sqlcutil.UUIDToString(updatedRow.ID),
		GroupID:  sqlcutil.UUIDToString(updatedRow.GroupID),
		Title:    title,
		Amount:   util.CentsToFloat(amountCents),
		PayerID:  payerID.String(),
		Mode:     updatedRow.Mode,
		Type:     updatedRow.Type,
		Category: updatedRow.Category,
		Splits:   outSplits,
	}

	// Log activity
	_ = LogActivity(ctx, h.Q, updatedRow.GroupID, uid, "expense_updated", fmt.Sprintf("An expense was updated: %s", req.Title), nil)

	// Emit SSE event
	if h.Hub != nil {
		h.Hub.Broadcast(sqlcutil.UUIDToString(updatedRow.GroupID), events.Event{
			Type:    events.ExpenseUpdated,
			GroupID: sqlcutil.UUIDToString(updatedRow.GroupID),
		})
	}

	c.JSON(http.StatusOK, resp)
}

func (h *ExpensesHandler) Delete(c *gin.Context) {
	uid, ok := util.MustUserID(c)
	if !ok {
		return
	}

	eid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expense id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	exp, err := h.Q.GetExpenseForDelete(ctx, sqlcutil.UUID(eid))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Must be member.
	isMember, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: exp.GroupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	payerUUID, _ := sqlcutil.UUIDToUUID(exp.PayerID)
	allowed := payerUUID == uid
	if createdUUID, ok := sqlcutil.UUIDToUUID(exp.CreatedBy); ok && createdUUID == uid {
		allowed = true
	}
	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err := h.Q.DeleteExpense(ctx, exp.ID); err != nil {
		logger.DBError("DeleteExpense", err, logger.Fields{"expense_id": eid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete expense"})
		return
	}

	// Log activity
	_ = LogActivity(ctx, h.Q, exp.GroupID, uid, "expense_deleted", "An expense was deleted", nil)

	// Emit SSE event
	if h.Hub != nil {
		h.Hub.Broadcast(sqlcutil.UUIDToString(exp.GroupID), events.Event{
			Type:    events.ExpenseDeleted,
			GroupID: sqlcutil.UUIDToString(exp.GroupID),
		})
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

// Money conversion functions moved to internal/util/money.go
