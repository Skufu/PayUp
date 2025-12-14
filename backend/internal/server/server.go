package server

import (
	"net/http"
	"os"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/handlers"
	"github.com/Skufu/PayUp/internal/middleware"
	"github.com/Skufu/PayUp/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Deps struct {
	Pool   *pgxpool.Pool
	Q      *sqlcdb.Queries
	Issuer auth.Issuer
}

// New constructs the HTTP router for the PayUp API.
//
// Keep this small and composable so we can grow endpoints
// section-by-section from plan.md without turning main.go into a monolith.
func New(deps Deps) *gin.Engine {
	// Default to quiet logs unless explicitly overridden.
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	// Request logs with colored status codes (200 green, 404 red, etc.).
	// Note: this is separate from Gin debug mode; release mode still supports logging.
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	uploadSvc, err := services.NewUploadService()
	if err != nil {
		// Uploads are optional in dev/early deployments.
		uploadSvc = nil
	}

	v1 := r.Group("/v1")
	{
		ah := &handlers.AuthHandler{Q: deps.Q, Issuer: deps.Issuer, UploadService: uploadSvc}
		authGroup := v1.Group("/auth")
		authGroup.POST("/register", ah.Register)
		authGroup.POST("/login", ah.Login)
		authGroup.POST("/refresh", ah.Refresh)
		authGroup.GET("/me", auth.Middleware(deps.Issuer), ah.Me)
		authGroup.PATCH("/profile", auth.Middleware(deps.Issuer), ah.UpdateProfile)

		v1.GET("/users/:id/profile", auth.Middleware(deps.Issuer), ah.GetUserPublicProfile)

		gh := &handlers.GroupsHandler{Pool: deps.Pool, Q: deps.Q}
		groups := v1.Group("/groups", auth.Middleware(deps.Issuer))
		groups.GET("", gh.List)
		groups.POST("", gh.Create)
		groups.GET("/:id", gh.Detail)
		groups.POST("/:id/invite", gh.CreateInvite)
		groups.POST("/join/:code", gh.JoinByCode)

		eh := &handlers.ExpensesHandler{Pool: deps.Pool, Q: deps.Q}
		v1.GET("/groups/:id/expenses", auth.Middleware(deps.Issuer), eh.ListByGroup)
		v1.POST("/groups/:id/expenses", auth.Middleware(deps.Issuer), eh.CreateForGroup)
		v1.DELETE("/expenses/:id", auth.Middleware(deps.Issuer), eh.Delete)

		bh := &handlers.BalancesHandler{Q: deps.Q}
		v1.GET("/groups/:id/balances", auth.Middleware(deps.Issuer), bh.GetByGroup)

		ph := &handlers.PaymentsHandler{Pool: deps.Pool, Q: deps.Q, UploadService: uploadSvc}
		v1.POST("/payments", auth.Middleware(deps.Issuer), ph.Create)
		v1.GET("/payments", auth.Middleware(deps.Issuer), ph.List)
		v1.PATCH("/payments/:id/approve", auth.Middleware(deps.Issuer), ph.Approve)
		v1.PATCH("/payments/:id/reject", auth.Middleware(deps.Issuer), ph.Reject)
		v1.POST("/payments/upload-proof", auth.Middleware(deps.Issuer), ph.UploadProof)

		nh := &handlers.NudgesHandler{Pool: deps.Pool, Q: deps.Q}
		nudges := v1.Group("/nudges", auth.Middleware(deps.Issuer))
		nudges.POST("", nh.Create)
		nudges.GET("", nh.ListMine)
		nudges.GET("/unread-count", nh.UnreadCount)
		nudges.PATCH("/:id/read", nh.MarkRead)
		nudges.POST("/mark-all-read", nh.MarkAllRead)

		puh := &handlers.PushHandler{Q: deps.Q}
		push := v1.Group("/push", auth.Middleware(deps.Issuer))
		push.POST("/subscribe", puh.Subscribe)
		push.DELETE("/unsubscribe", puh.Unsubscribe)
	}

	return r
}
