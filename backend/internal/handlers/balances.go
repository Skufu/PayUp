package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BalancesHandler struct {
	Q *sqlcdb.Queries
}

func (h *BalancesHandler) GetByGroup(c *gin.Context) {
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

	// Use optimized SQL query that computes balances in the database
	rows, err := h.Q.ComputeBalancesByGroup(ctx, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute balances"})
		return
	}

	// Convert to map format expected by frontend
	balances := make(map[string]float64, len(rows))
	for _, row := range rows {
		userID := sqlcutil.UUIDToString(row.UserID)
		balance, err := strconv.ParseFloat(row.Balance, 64)
		if err != nil {
			balance = 0
		}
		balances[userID] = balance
	}

	// Ensure all members have an entry (even if balance is 0)
	members, err := h.Q.ListGroupMemberIDs(ctx, groupID)
	if err == nil {
		for _, mid := range members {
			userID := sqlcutil.UUIDToString(mid)
			if _, exists := balances[userID]; !exists {
				balances[userID] = 0
			}
		}
	}

	c.JSON(http.StatusOK, balances)
}
