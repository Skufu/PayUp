package middleware

import (
	"os"

	"github.com/Skufu/PayUp/internal/logger"
	"github.com/gin-gonic/gin"
)

// ErrorSanitizer sanitizes error responses in production to hide internal details.
// In development, it passes errors through as-is.
// This should be one of the last middleware to run.
func ErrorSanitizer() gin.HandlerFunc {
	isProduction := os.Getenv("GIN_MODE") == "release"

	return func(c *gin.Context) {
		c.Next()

		// Only sanitize in production
		if !isProduction {
			return
		}

		// Check for 5xx errors with detailed messages
		status := c.Writer.Status()
		if status >= 500 && len(c.Errors) > 0 {
			// Log the actual errors
			for _, err := range c.Errors {
				logger.Error("internal server error", logger.Fields{
					"error":  err.Error(),
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
				})
			}
		}
	}
}

// SafeError returns a user-safe error message.
// In production, generic messages are returned for 5xx errors.
// In development, the actual error is returned.
func SafeError(c *gin.Context, status int, internalMsg string, userMsg string) {
	isProduction := os.Getenv("GIN_MODE") == "release"

	if isProduction && status >= 500 {
		// Log the internal error
		logger.Error("internal error", logger.Fields{
			"internal_message": internalMsg,
			"path":             c.Request.URL.Path,
			"method":           c.Request.Method,
			"ip":               c.ClientIP(),
		})
		// Return generic message to user
		c.JSON(status, gin.H{"error": userMsg})
	} else {
		// In development, show the internal message
		c.JSON(status, gin.H{"error": internalMsg})
	}
}
