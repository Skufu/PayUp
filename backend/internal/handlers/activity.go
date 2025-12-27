package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ActivityHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

type activityResponse struct {
	ID           string    `json:"id"`
	GroupID      string    `json:"groupId"`
	UserID       string    `json:"userId"`
	UserName     string    `json:"userName"`
	UserAvatar   string    `json:"userAvatar"`
	ActivityType string    `json:"activityType"`
	Description  string    `json:"description"`
	Metadata     []byte    `json:"metadata"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (h *ActivityHandler) ListByGroup(c *gin.Context) {
	gid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	groupID := sqlcutil.UUID(gid)

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.Q.ListActivityByGroup(ctx, sqlcdb.ListActivityByGroupParams{
		GroupID: groupID,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list activity"})
		return
	}

	res := make([]activityResponse, len(rows))
	for i, row := range rows {
		userName := ""
		if row.UserName != nil {
			userName = *row.UserName
		}
		userAvatar := ""
		if row.UserAvatarUrl != nil {
			userAvatar = *row.UserAvatarUrl
		}
		createdAt, _ := sqlcutil.Time(row.CreatedAt)
		res[i] = activityResponse{
			ID:           sqlcutil.UUIDToString(row.ID),
			GroupID:      sqlcutil.UUIDToString(row.GroupID),
			UserID:       sqlcutil.UUIDToString(row.UserID),
			UserName:     userName,
			UserAvatar:   userAvatar,
			ActivityType: row.ActivityType,
			Description:  row.Description,
			Metadata:     row.Metadata,
			CreatedAt:    createdAt,
		}
	}

	c.JSON(http.StatusOK, res)
}

// LogActivity is a helper that can be called from other handlers.
// For now, we'll just expose it as a method on the handler or as a service.
func LogActivity(ctx context.Context, q *sqlcdb.Queries, groupID pgtype.UUID, userID uuid.UUID, activityType, description string, metadata []byte) error {
	_, err := q.CreateActivity(ctx, sqlcdb.CreateActivityParams{
		GroupID:      groupID,
		UserID:       sqlcutil.UUID(userID),
		ActivityType: activityType,
		Description:  description,
		Metadata:     metadata,
	})
	return err
}
