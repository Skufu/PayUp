package middleware

import (
	"runtime/debug"
	"time"

	"github.com/Skufu/PayUp/internal/logger"
	"github.com/gin-gonic/gin"
)

// StructuredLogger logs requests with timing and error details using structured logging.
func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method

		fullPath := path
		if query != "" {
			fullPath = path + "?" + query
		}

		fields := logger.Fields{}

		// Log errors if any
		if len(c.Errors) > 0 {
			fields["errors"] = c.Errors.String()
		}

		// Add user ID if available
		if userID, exists := c.Get("userID"); exists {
			fields["user_id"] = userID
		}

		logger.Request(method, fullPath, status, latency, clientIP, fields)
	}
}

// RecoveryWithLogger returns a gin middleware that recovers from panics
// and logs them using structured logging.
func RecoveryWithLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				stack := debug.Stack()
				logger.Panic(err, stack)

				c.AbortWithStatusJSON(500, gin.H{"error": "internal server error"})
			}
		}()
		c.Next()
	}
}
