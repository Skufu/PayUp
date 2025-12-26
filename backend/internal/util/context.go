package util

import (
	"net/http"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// MustUserID extracts and validates the user ID from the request context.
// Returns the UUID and true if successful, or uuid.Nil and false if unauthorized.
// On failure, it also writes the 401 response.
func MustUserID(c *gin.Context) (uuid.UUID, bool) {
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
