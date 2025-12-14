package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// StructuredLogger logs requests with timing and error details.
// Uses standard library logger for simplicity (can be upgraded to zap later).
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

		// Log format: [timestamp] status | latency | ip | method path?query | errors
		logLine := ""
		if query != "" {
			logLine = path + "?" + query
		} else {
			logLine = path
		}

		// Log errors if any
		if len(c.Errors) > 0 {
			log.Printf("[API] %d | %13v | %15s | %s %s | errors: %s",
				status, latency, clientIP, method, logLine, c.Errors.String())
		} else if status >= 400 {
			// Log client/server errors
			log.Printf("[API] %d | %13v | %15s | %s %s",
				status, latency, clientIP, method, logLine)
		}
		// Don't log successful requests to reduce noise (gin.Logger() already does this)
	}
}
