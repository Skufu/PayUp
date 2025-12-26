package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestIDKey is the context key for the request ID.
const RequestIDKey = "requestID"

// RequestIDHeader is the HTTP header name for the request ID.
const RequestIDHeader = "X-Request-ID"

// RequestID generates a unique request ID for each request and adds it to the context.
// This enables tracing all logs related to a single request.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request ID was provided by client/load balancer
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Store in context for handlers to access
		c.Set(RequestIDKey, requestID)

		// Add to response headers for client correlation
		c.Header(RequestIDHeader, requestID)

		c.Next()
	}
}

// GetRequestID extracts the request ID from the gin context.
// Returns empty string if not found.
func GetRequestID(c *gin.Context) string {
	if id, exists := c.Get(RequestIDKey); exists {
		if idStr, ok := id.(string); ok {
			return idStr
		}
	}
	return ""
}
