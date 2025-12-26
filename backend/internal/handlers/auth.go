package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/Skufu/PayUp/internal/logger"
	"github.com/Skufu/PayUp/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"google.golang.org/api/idtoken"
)

type AuthHandler struct {
	Q      *sqlcdb.Queries
	Issuer auth.Issuer

	UploadService  *services.UploadService
	GoogleClientID string
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

type paymentQRResponse struct {
	ID        string    `json:"id"`
	Provider  string    `json:"provider"`
	QRURL     string    `json:"qrUrl"`
	IsPrimary bool      `json:"isPrimary"`
	CreatedAt time.Time `json:"createdAt"`
}

type userResponse struct {
	ID         string               `json:"id"`
	Email      string               `json:"email"`
	Name       *string              `json:"name,omitempty"`
	AvatarURL  *string              `json:"avatarUrl,omitempty"`
	QRURL      *string              `json:"qrUrl,omitempty"` // Legacy field
	PaymentQRs []paymentQRResponse  `json:"paymentQRs,omitempty"`
	CreatedAt  time.Time            `json:"createdAt"`
	UpdatedAt  time.Time            `json:"updatedAt"`
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
	if !ValidateEmail(email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
		return
	}

	if err := ValidatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		PasswordHash: &pwHash,
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

	c.JSON(http.StatusCreated, authResponse{
		User: h.toUserResponse(ctx, sqlcdb.GetUserByIDRow{
			ID:        row.ID,
			Email:     row.Email,
			Name:      row.Name,
			AvatarUrl: row.AvatarUrl,
			QrUrl:     row.QrUrl,
			CreatedAt: row.CreatedAt,
			UpdatedAt: row.UpdatedAt,
		}),
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
	if !ValidateEmail(email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
		return
	}
	if req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.Q.GetUserByEmail(ctx, email)
	if err != nil || u.PasswordHash == nil || !auth.CheckPassword(*u.PasswordHash, req.Password) {
		// Log failed auth attempt
		reason := "invalid_credentials"
		if err != nil {
			reason = "user_not_found"
		} else if u.PasswordHash == nil {
			reason = "no_password_set"
		} else {
			reason = "wrong_password"
		}
		logger.AuthFailure(reason, c.ClientIP(), email)

		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	idStr := sqlcutil.UUIDToString(u.ID)
	tokens, err := h.Issuer.Issue(idStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusOK, authResponse{
		User: h.toUserResponse(ctx, sqlcdb.GetUserByIDRow{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			AvatarUrl: u.AvatarUrl,
			QrUrl:     u.QrUrl,
			CreatedAt: u.CreatedAt,
			UpdatedAt: u.UpdatedAt,
		}),
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

	c.JSON(http.StatusOK, h.toUserResponse(ctx, u))
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	// Accept multipart/form-data for optional QR and avatar uploads.
	name := strings.TrimSpace(c.PostForm("name"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	var qrPtr *string
	if file, header, err := c.Request.FormFile("payment_qr"); err == nil {
		defer file.Close()

		if h.UploadService == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "upload service not available"})
			return
		}

		url, upErr := h.UploadService.UploadPaymentQR(ctx, file, header, uid.String())
		if upErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("upload failed: %v", upErr)})
			return
		}
		qrPtr = &url
	}

	var avatarPtr *string
	if file, header, err := c.Request.FormFile("avatar"); err == nil {
		defer file.Close()

		if h.UploadService == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "upload service not available"})
			return
		}

		url, upErr := h.UploadService.UploadAvatar(ctx, file, header, uid.String())
		if upErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("avatar upload failed: %v", upErr)})
			return
		}
		avatarPtr = &url
	}

	var namePtr *string
	if name != "" {
		namePtr = &name
	}

	if err := h.Q.UpdateUserProfile(ctx, sqlcdb.UpdateUserProfileParams{
		ID:        sqlcutil.UUID(uid),
		Name:      namePtr,
		QrUrl:     qrPtr,
		AvatarUrl: avatarPtr,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *AuthHandler) GetUserPublicProfile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.Q.GetUserPublicProfile(ctx, sqlcutil.UUID(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Keep response shape aligned with AuthUser fields.
	c.JSON(http.StatusOK, gin.H{
		"id":        sqlcutil.UUIDToString(u.ID),
		"name":      u.Name,
		"avatarUrl": u.AvatarUrl,
		"qrUrl":     u.QrUrl,
	})
}

type googleAuthRequest struct {
	IDToken string `json:"idToken"`
}

type resetRequestRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// GoogleAuth handles Google OAuth sign-in using ID token from frontend.
func (h *AuthHandler) GoogleAuth(c *gin.Context) {
	var req googleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.IDToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idToken is required"})
		return
	}

	if h.GoogleClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "google auth not configured"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Verify the ID token with Google
	payload, err := idtoken.Validate(ctx, req.IDToken, h.GoogleClientID)
	if err != nil {
		logger.Error("google token validation failed", logger.Fields{
			"error":            err.Error(),
			"client_id_length": len(h.GoogleClientID),
		})
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid google token"})
		return
	}

	// Extract user info from the token payload
	googleID, _ := payload.Claims["sub"].(string)
	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	if googleID == "" || email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid token claims"})
		return
	}

	// Check if OAuth account exists
	oauthAcc, err := h.Q.GetOAuthAccount(ctx, sqlcdb.GetOAuthAccountParams{
		Provider:   "google",
		ProviderID: googleID,
	})

	var userID string
	var user sqlcdb.GetUserByIDRow

	if err == nil {
		// OAuth account exists, get user
		userID = sqlcutil.UUIDToString(oauthAcc.UserID)
		user, err = h.Q.GetUserByID(ctx, oauthAcc.UserID)
		if err != nil {
			logger.Error("google auth: failed to get user by id", logger.Fields{"error": err.Error(), "user_id": userID})
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}
	} else {
		// OAuth account doesn't exist, check if user with email exists
		existingUser, emailErr := h.Q.GetUserByEmail(ctx, strings.ToLower(email))
		if emailErr == nil {
			// User exists, link OAuth account
			userID = sqlcutil.UUIDToString(existingUser.ID)
			_, err = h.Q.CreateOAuthAccount(ctx, sqlcdb.CreateOAuthAccountParams{
				UserID:     existingUser.ID,
				Provider:   "google",
				ProviderID: googleID,
				Email:      &email,
			})
			if err != nil {
				logger.Error("google auth: failed to link google account", logger.Fields{"error": err.Error(), "email": email})
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link google account"})
				return
			}
			user, _ = h.Q.GetUserByID(ctx, existingUser.ID)
		} else {
			// Create new user
			var namePtr, picturePtr *string
			if name != "" {
				namePtr = &name
			}
			if picture != "" {
				picturePtr = &picture
			}

			newUser, createErr := h.Q.CreateOAuthUser(ctx, sqlcdb.CreateOAuthUserParams{
				Email:     strings.ToLower(email),
				Name:      namePtr,
				AvatarUrl: picturePtr,
			})
			if createErr != nil {
				logger.Error("google auth: failed to create user", logger.Fields{"error": createErr.Error(), "email": email})
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
				return
			}

			userID = sqlcutil.UUIDToString(newUser.ID)

			// Create OAuth account link
			_, err = h.Q.CreateOAuthAccount(ctx, sqlcdb.CreateOAuthAccountParams{
				UserID:     newUser.ID,
				Provider:   "google",
				ProviderID: googleID,
				Email:      &email,
			})
			if err != nil {
				logger.Error("google auth: failed to create oauth account", logger.Fields{"error": err.Error(), "email": email})
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create oauth account"})
				return
			}

			user = sqlcdb.GetUserByIDRow{
				ID:        newUser.ID,
				Email:     newUser.Email,
				Name:      newUser.Name,
				AvatarUrl: newUser.AvatarUrl,
				QrUrl:     newUser.QrUrl,
				CreatedAt: newUser.CreatedAt,
				UpdatedAt: newUser.UpdatedAt,
			}
		}
	}

	// Issue JWT tokens
	tokens, err := h.Issuer.Issue(userID)
	if err != nil {
		logger.Error("google auth: failed to issue token", logger.Fields{"error": err.Error(), "user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusOK, authResponse{
		User:  h.toUserResponse(ctx, user),
		Token: tokens,
	})
}

// RequestPasswordReset handles password reset requests.
// In a production system, this would send an email with the reset link.
// For now, it returns the token in the response for testing purposes.
func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var req resetRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if !ValidateEmail(email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Look up user by email
	u, err := h.Q.GetUserByEmail(ctx, email)
	if err != nil {
		// Don't reveal whether the email exists - return success either way
		c.JSON(http.StatusOK, gin.H{"message": "if the email exists, a reset link has been sent"})
		return
	}

	// Check if user has a password (OAuth-only users cannot reset password)
	if u.PasswordHash == nil {
		c.JSON(http.StatusOK, gin.H{"message": "if the email exists, a reset link has been sent"})
		return
	}

	// Generate reset token
	userID := sqlcutil.UUIDToString(u.ID)
	resetToken, err := h.Issuer.IssueResetToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reset token"})
		return
	}

	// In production, send email here instead of returning the token
	// For now, return the token for testing
	c.JSON(http.StatusOK, gin.H{
		"message":    "if the email exists, a reset link has been sent",
		"resetToken": resetToken, // Remove this in production - send via email instead
	})
}

// ResetPassword handles the actual password reset using the token.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	if req.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}

	if err := ValidatePassword(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse and validate the reset token
	userID, err := h.Issuer.Parse(req.Token, "reset")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired reset token"})
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Hash the new password
	pwHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Update the password
	if err := h.Q.UpdateUserPassword(ctx, sqlcdb.UpdateUserPasswordParams{
		ID:           sqlcutil.UUID(uid),
		PasswordHash: &pwHash,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password reset successfully"})
}

func (h *AuthHandler) toUserResponse(ctx context.Context, u sqlcdb.GetUserByIDRow) userResponse {
	createdAt, _ := sqlcutil.Time(u.CreatedAt)
	updatedAt, _ := sqlcutil.Time(u.UpdatedAt)

	res := userResponse{
		ID:        sqlcutil.UUIDToString(u.ID),
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarUrl,
		QRURL:     u.QrUrl,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}

	qrs, err := h.Q.GetPaymentQRsByUser(ctx, u.ID)
	if err == nil {
		for _, qr := range qrs {
			ct, _ := sqlcutil.Time(qr.CreatedAt)
			res.PaymentQRs = append(res.PaymentQRs, paymentQRResponse{
				ID:        sqlcutil.UUIDToString(qr.ID),
				Provider:  qr.Provider,
				QRURL:     qr.QrUrl,
				IsPrimary: qr.IsPrimary,
				CreatedAt: ct,
			})
		}
	}

	return res
}

func (h *AuthHandler) ListPaymentQRs(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	qrs, err := h.Q.GetPaymentQRsByUser(ctx, sqlcutil.UUID(uid))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch payment QRs"})
		return
	}

	res := make([]paymentQRResponse, 0, len(qrs))
	for _, qr := range qrs {
		ct, _ := sqlcutil.Time(qr.CreatedAt)
		res = append(res, paymentQRResponse{
			ID:        sqlcutil.UUIDToString(qr.ID),
			Provider:  qr.Provider,
			QRURL:     qr.QrUrl,
			IsPrimary: qr.IsPrimary,
			CreatedAt: ct,
		})
	}

	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) AddPaymentQR(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	provider := strings.TrimSpace(c.PostForm("provider"))
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provider is required"})
		return
	}

	file, header, err := c.Request.FormFile("qr_image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "qr_image is required"})
		return
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	if h.UploadService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "upload service not available"})
		return
	}

	// Upload QR image
	url, err := h.UploadService.UploadPaymentQR(ctx, file, header, uid.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("upload failed: %v", err)})
		return
	}

	// Check if this is the first QR, if so make it primary
	existing, _ := h.Q.GetPaymentQRsByUser(ctx, sqlcutil.UUID(uid))
	isPrimary := len(existing) == 0

	qr, err := h.Q.CreatePaymentQR(ctx, sqlcdb.CreatePaymentQRParams{
		UserID:    sqlcutil.UUID(uid),
		Provider:  provider,
		QrUrl:     url,
		IsPrimary: isPrimary,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save payment QR"})
		return
	}

	ct, _ := sqlcutil.Time(qr.CreatedAt)
	c.JSON(http.StatusCreated, paymentQRResponse{
		ID:        sqlcutil.UUIDToString(qr.ID),
		Provider:  qr.Provider,
		QRURL:     qr.QrUrl,
		IsPrimary: qr.IsPrimary,
		CreatedAt: ct,
	})
}

func (h *AuthHandler) DeletePaymentQR(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err = h.Q.DeletePaymentQR(ctx, sqlcdb.DeletePaymentQRParams{
		ID:     sqlcutil.UUID(id),
		UserID: sqlcutil.UUID(uid),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete payment QR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "payment QR deleted"})
}

func (h *AuthHandler) SetPrimaryPaymentQR(c *gin.Context) {
	uid, ok := mustUserID(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Unset existing primaries
	err = h.Q.UnsetPrimaryPaymentQRs(ctx, sqlcutil.UUID(uid))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update primary status"})
		return
	}

	// Set new primary
	err = h.Q.SetPrimaryPaymentQR(ctx, sqlcdb.SetPrimaryPaymentQRParams{
		ID:     sqlcutil.UUID(id),
		UserID: sqlcutil.UUID(uid),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set primary payment QR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "primary payment QR updated"})
}
