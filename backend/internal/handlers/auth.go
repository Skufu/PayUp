package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

type AuthHandler struct {
	Q      *sqlcdb.Queries
	Issuer auth.Issuer
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type userResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      *string   `json:"name,omitempty"`
	AvatarURL *string   `json:"avatarUrl,omitempty"`
	QRURL     *string   `json:"qrUrl,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type authResponse struct {
	User  userResponse   `json:"user"`
	Token auth.TokenPair `json:"token"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email or password"})
		return
	}

	pwHash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	name := strings.TrimSpace(req.Name)
	var namePtr *string
	if name != "" {
		namePtr = &name
	}

	row, err := h.Q.CreateUser(ctx, sqlcdb.CreateUserParams{
		Email:        email,
		PasswordHash: pwHash,
		Name:         namePtr,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	idStr := sqlcutil.UUIDToString(row.ID)
	tokens, err := h.Issuer.Issue(idStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	createdAt, _ := sqlcutil.Time(row.CreatedAt)
	updatedAt, _ := sqlcutil.Time(row.UpdatedAt)
	c.JSON(http.StatusCreated, authResponse{
		User: userResponse{
			ID:        idStr,
			Email:     row.Email,
			Name:      row.Name,
			AvatarURL: row.AvatarUrl,
			QRURL:     row.QrUrl,
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		},
		Token: tokens,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email or password"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.Q.GetUserByEmail(ctx, email)
	if err != nil || !auth.CheckPassword(u.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	idStr := sqlcutil.UUIDToString(u.ID)
	tokens, err := h.Issuer.Issue(idStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	createdAt, _ := sqlcutil.Time(u.CreatedAt)
	updatedAt, _ := sqlcutil.Time(u.UpdatedAt)
	c.JSON(http.StatusOK, authResponse{
		User: userResponse{
			ID:        idStr,
			Email:     u.Email,
			Name:      u.Name,
			AvatarURL: u.AvatarUrl,
			QRURL:     u.QrUrl,
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		},
		Token: tokens,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if req.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refreshToken is required"})
		return
	}

	userID, err := h.Issuer.Parse(req.RefreshToken, "refresh")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	tokens, err := h.Issuer.Issue(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokens})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := c.Get(auth.CtxUserIDKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	uid, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	id := sqlcutil.UUID(uid)
	u, err := h.Q.GetUserByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	createdAt, _ := sqlcutil.Time(u.CreatedAt)
	updatedAt, _ := sqlcutil.Time(u.UpdatedAt)
	c.JSON(http.StatusOK, userResponse{
		ID:        uid.String(),
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarUrl,
		QRURL:     u.QrUrl,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	})
}
