package middleware

import (
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS configures cross-origin requests.
//
// In production (Vercel -> Render), CORS must be enabled.
// Configure allowed origins via CORS_ORIGINS (comma-separated).
// Example:
//
//	CORS_ORIGINS=https://payup.vercel.app,https://www.payup.app
func CORS() gin.HandlerFunc {
	origins := parseOrigins(os.Getenv("CORS_ORIGINS"))
	if len(origins) == 0 {
		// Dev defaults.
		origins = []string{"http://localhost:5173", "http://localhost:4173"}
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	})
}

func parseOrigins(v string) []string {
	v = strings.TrimSpace(v)
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		o := strings.TrimSpace(p)
		if o == "" {
			continue
		}
		out = append(out, o)
	}
	return out
}




