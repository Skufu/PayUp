package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MaxGroupMembers is the maximum number of members allowed per group.
const MaxGroupMembers = 20

type GroupsHandler struct {
	Pool *pgxpool.Pool
	Q    *sqlcdb.Queries
}

type createGroupRequest struct {
	Name string `json:"name"`
}

type groupResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	CreatedAt   time.Time `json:"createdAt"`
	MemberCount int64     `json:"memberCount"`
}

type groupMemberResponse struct {
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	AvatarUrl string    `json:"avatarUrl"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joinedAt"`
}

type groupDetailResponse struct {
	ID        string                `json:"id"`
	Name      string                `json:"name"`
	Members   []groupMemberResponse `json:"members"`
	CreatedAt time.Time             `json:"createdAt"`
}

type inviteResponse struct {
	Code      string     `json:"code"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

func (h *GroupsHandler) List(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.Q.ListGroupsForUser(ctx, sqlcutil.UUID(uid))
	if err != nil {
		logger.DBError("ListGroupsForUser", err, logger.Fields{"user_id": uid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list groups"})
		return
	}

	out := make([]groupResponse, 0, len(rows))
	for _, g := range rows {
		createdAt, _ := sqlcutil.Time(g.CreatedAt)
		out = append(out, groupResponse{
			ID:          sqlcutil.UUIDToString(g.ID),
			Name:        g.Name,
			CreatedAt:   createdAt,
			MemberCount: g.MemberCount,
		})
	}

	c.JSON(http.StatusOK, out)
}

func (h *GroupsHandler) Create(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	var req createGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if err := ValidateGroupName(name); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		logger.DBError("BeginTx", err, logger.Fields{"operation": "CreateGroup"})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create group"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := sqlcdb.New(tx)
	created, err := qtx.CreateGroup(ctx, sqlcdb.CreateGroupParams{
		Name:      name,
		CreatedBy: sqlcutil.UUID(uid),
	})
	if err != nil {
		logger.DBError("CreateGroup", err, logger.Fields{"name": name})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create group"})
		return
	}

	if err := qtx.AddGroupMember(ctx, sqlcdb.AddGroupMemberParams{
		GroupID: created.ID,
		UserID:  sqlcutil.UUID(uid),
		Role:    "owner",
	}); err != nil {
		logger.DBError("AddGroupMember", err, logger.Fields{"group_id": sqlcutil.UUIDToString(created.ID)})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create group"})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		logger.DBError("CommitTx", err, logger.Fields{"operation": "CreateGroup"})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create group"})
		return
	}

	createdAt, _ := sqlcutil.Time(created.CreatedAt)
	c.JSON(http.StatusCreated, groupResponse{
		ID:        sqlcutil.UUIDToString(created.ID),
		Name:      created.Name,
		CreatedAt: createdAt,
	})
}

func (h *GroupsHandler) Detail(c *gin.Context) {
	uid, ok := mustUserID(c)
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

	// Authz: must be a member.
	exists, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	group, err := h.Q.GetGroup(ctx, groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	rows, err := h.Q.ListGroupMembers(ctx, groupID)
	if err != nil {
		logger.DBError("ListGroupMembers", err, logger.Fields{"group_id": gid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load members"})
		return
	}

	members := make([]groupMemberResponse, 0, len(rows))
	for _, m := range rows {
		joinedAt, _ := sqlcutil.Time(m.JoinedAt)

		// Use joined user data from SQL query
		name := ""
		if m.UserName != nil && *m.UserName != "" {
			name = *m.UserName
		} else {
			name = m.UserEmail
		}

		avatar := ""
		if m.UserAvatarUrl != nil {
			avatar = *m.UserAvatarUrl
		}

		members = append(members, groupMemberResponse{
			UserID:    sqlcutil.UUIDToString(m.UserID),
			Name:      name,
			AvatarUrl: avatar,
			Role:      m.Role,
			JoinedAt:  joinedAt,
		})
	}

	createdAt, _ := sqlcutil.Time(group.CreatedAt)
	c.JSON(http.StatusOK, groupDetailResponse{
		ID:        gid.String(),
		Name:      group.Name,
		Members:   members,
		CreatedAt: createdAt,
	})
}

func (h *GroupsHandler) CreateInvite(c *gin.Context) {
	uid, ok := mustUserID(c)
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

	// Authz: must be a member.
	exists, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	code := randomInviteCode(8)
	var expiresAt *time.Time = nil

	if err := h.Q.CreateInvite(ctx, sqlcdb.CreateInviteParams{
		GroupID:   groupID,
		Code:      code,
		CreatedBy: sqlcutil.UUID(uid),
		ExpiresAt: sqlcutil.NullTimestamptz(expiresAt),
	}); err != nil {
		logger.DBError("CreateInvite", err, logger.Fields{"group_id": gid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invite"})
		return
	}

	c.JSON(http.StatusCreated, inviteResponse{Code: code, ExpiresAt: expiresAt})
}

func (h *GroupsHandler) JoinByCode(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	code := strings.TrimSpace(strings.ToUpper(c.Param("code")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	inv, err := h.Q.GetInviteByCode(ctx, code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invalid invite"})
		return
	}
	if inv.ExpiresAt.Valid && inv.ExpiresAt.Time.Before(time.Now()) {
		c.JSON(http.StatusGone, gin.H{"error": "invite expired"})
		return
	}

	// Check if user is already a member
	isMember, err := h.Q.IsGroupMember(ctx, sqlcdb.IsGroupMemberParams{
		GroupID: inv.GroupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err == nil && isMember {
		c.JSON(http.StatusOK, gin.H{"groupId": sqlcutil.UUIDToString(inv.GroupID)})
		return
	}

	// Check member limit
	count, err := h.Q.CountGroupMembers(ctx, inv.GroupID)
	if err != nil {
		logger.DBError("CountGroupMembers", err, logger.Fields{"group_id": sqlcutil.UUIDToString(inv.GroupID)})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join group"})
		return
	}
	if count >= MaxGroupMembers {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group has reached maximum member limit (20)"})
		return
	}

	if err := h.Q.AddGroupMember(ctx, sqlcdb.AddGroupMemberParams{
		GroupID: inv.GroupID,
		UserID:  sqlcutil.UUID(uid),
		Role:    "member",
	}); err != nil {
		logger.DBError("AddGroupMember", err, logger.Fields{"group_id": sqlcutil.UUIDToString(inv.GroupID), "user_id": uid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join group"})
		return
	}

	// Log activity
	_ = LogActivity(ctx, h.Q, inv.GroupID, uid, "member_joined", "A new member joined the group", nil)

	c.JSON(http.StatusOK, gin.H{"groupId": sqlcutil.UUIDToString(inv.GroupID)})
}

func mustUserID(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(auth.CtxUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return uuid.Nil, false
	}
	s, _ := v.(string)
	uid, err := uuid.Parse(s)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return uuid.Nil, false
	}
	return uid, true
}

func randomInviteCode(n int) string {
	// Crockford-ish base32 without padding, upper-case, URL-safe.
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "INVITE"
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
	enc = strings.TrimRight(enc, "=")
	enc = strings.ReplaceAll(enc, "O", "0")
	enc = strings.ReplaceAll(enc, "I", "1")
	enc = strings.ReplaceAll(enc, "L", "1")
	if n > len(enc) {
		n = len(enc)
	}
	return enc[:n]
}

func (h *GroupsHandler) Leave(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	gid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	groupID := sqlcutil.UUID(gid)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Check if user has zero balance
	if err := h.ensureZeroBalance(ctx, groupID, uid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Q.LeaveGroup(ctx, sqlcdb.LeaveGroupParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil {
		logger.DBError("LeaveGroup", err, logger.Fields{"group_id": gid.String(), "user_id": uid.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to leave group"})
		return
	}

	// Log activity
	_ = LogActivity(ctx, h.Q, groupID, uid, "member_left", "A member left the group", nil)

	c.Status(http.StatusNoContent)
}

func (h *GroupsHandler) RemoveMember(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	gid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	groupID := sqlcutil.UUID(gid)

	targetUID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Authz: requester must be admin
	role, err := h.Q.GetMemberRole(ctx, sqlcdb.GetMemberRoleParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(uid),
	})
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only admins can remove members"})
		return
	}

	// Check if target has zero balance
	if err := h.ensureZeroBalance(ctx, groupID, targetUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "member " + err.Error()})
		return
	}

	err = h.Q.LeaveGroup(ctx, sqlcdb.LeaveGroupParams{
		GroupID: groupID,
		UserID:  sqlcutil.UUID(targetUID),
	})
	if err != nil {
		logger.DBError("LeaveGroup", err, logger.Fields{"group_id": gid.String(), "target_user_id": targetUID.String()})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}

	// Log activity
	targetUser, _ := h.Q.GetUserPublicProfile(ctx, sqlcutil.UUID(targetUID))
	targetName := "a member"
	if targetUser.Name != nil {
		targetName = *targetUser.Name
	}
	_ = LogActivity(ctx, h.Q, groupID, uid, "member_removed", fmt.Sprintf("%s was removed from the group", targetName), nil)

	c.Status(http.StatusNoContent)
}

func (h *GroupsHandler) ensureZeroBalance(ctx context.Context, groupID pgtype.UUID, userID uuid.UUID) error {
	rows, err := h.Q.ComputeBalancesByGroup(ctx, groupID)
	if err != nil {
		return err
	}

	for _, row := range rows {
		u, ok := sqlcutil.UUIDToUUID(row.UserID)
		if ok && u == userID {
			bal, err := strconv.ParseFloat(row.Balance, 64)
			if err != nil {
				return err
			}
			if math.Abs(bal) > 0.01 {
				return fmt.Errorf("must settle balance first")
			}
		}
	}
	return nil
}
