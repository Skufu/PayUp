package server

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// New constructs the HTTP router for the PayUp API.
//
// Keep this small and composable so we can grow endpoints
// section-by-section from plan.md without turning main.go into a monolith.
func New() *gin.Engine {
	// Default to quiet logs unless explicitly overridden.
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return r
}
