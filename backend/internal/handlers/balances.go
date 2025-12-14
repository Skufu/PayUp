package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
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
	balances := make(map[string]float64, len(members))
	for _, mid := range members {
		balances[sqlcutil.UUIDToString(mid)] = 0
	}

	rows, err := h.Q.ComputeBalancesByGroup(ctx, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute balances"})
		return
	}

	for _, row := range rows {
		f, _ := strconv.ParseFloat(row.Balance, 64)
		balances[sqlcutil.UUIDToString(row.UserID)] = f
	}

	c.JSON(http.StatusOK, balances)
}
