package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// EnforceHTTPS redirects HTTP requests to HTTPS in production.
func EnforceHTTPS() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only enforce in production (release mode)
		if os.Getenv("GIN_MODE") != "release" {
			c.Next()
			return
		}

		// Check if request came through HTTPS (behind reverse proxy like Render/Vercel)
		proto := c.GetHeader("X-Forwarded-Proto")
		if proto != "" && proto != "https" {
			httpsURL := "https://" + c.Request.Host + c.Request.RequestURI
			c.Redirect(http.StatusMovedPermanently, httpsURL)
			c.Abort()
			return
		}

		c.Next()
	}
}
