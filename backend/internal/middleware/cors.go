package middleware

import (
	"log"
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
//
// SECURITY: Never use "*" as allowed origin in production.
func CORS() gin.HandlerFunc {
	origins := parseOrigins(os.Getenv("CORS_ORIGINS"))
	isProduction := os.Getenv("GIN_MODE") == "release"

	if len(origins) == 0 {
		if isProduction {
			log.Println("[SECURITY WARNING] CORS_ORIGINS not set in production! Defaulting to strict mode (no origins allowed)")
			origins = []string{} // No origins allowed if not explicitly set in production
		} else {
			// Dev defaults.
			origins = []string{"http://localhost:5173", "http://localhost:4173"}
		}
	}

	// Security check: reject wildcard in production
	if isProduction {
		for _, o := range origins {
			if o == "*" {
				log.Println("[SECURITY ERROR] Wildcard CORS origin '*' is not allowed in production!")
				origins = []string{} // Reject all if wildcard is set
				break
			}
		}
	}

	config := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}

	// Use AllowOriginFunc when origins is empty to avoid panic
	if len(origins) == 0 {
		config.AllowOriginFunc = func(origin string) bool {
			return false // Reject all origins when none are configured
		}
	} else {
		config.AllowOrigins = origins
	}

	return cors.New(config)
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
