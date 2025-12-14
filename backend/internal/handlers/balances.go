package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/balance"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BalancesHandler struct {
	Q *sqlcdb.Queries
}

func (h *BalancesHandler) GetByGroup(c *gin.Context) {
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()

	// Authz: must be group member.
	isMember, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// Start with all members at 0.
	members, err := h.Q.ListGroupMemberIDs(ctx, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute balances"})
		return
	}
	memberIDs := make([]string, 0, len(members))
	for _, mid := range members {
		memberIDs = append(memberIDs, sqlcutil.UUIDToString(mid))
	}

	expRows, err := h.Q.ListExpensesByGroup(ctx, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute balances"})
		return
	}

	expenses := make([]balance.Expense, 0, len(expRows))
	for _, row := range expRows {
		var splits map[string]float64
		if err := json.Unmarshal([]byte(row.Splits), &splits); err != nil {
			splits = map[string]float64{}
		}
		amt, _ := strconv.ParseFloat(row.Amount, 64)
		expenses = append(expenses, balance.Expense{
			PayerID: sqlcutil.UUIDToString(row.PayerID),
			Amount:  amt,
			Splits:  splits,
		})
	}

	balances, err := balance.Compute(memberIDs, expenses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute balances"})
		return
	}

	c.JSON(http.StatusOK, balances)
}
