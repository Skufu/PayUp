package server

import (
	"net/http"
	"os"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/events"
	"github.com/Skufu/PayUp/internal/handlers"
	"github.com/Skufu/PayUp/internal/logger"
	"github.com/Skufu/PayUp/internal/middleware"
	"github.com/Skufu/PayUp/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Deps struct {
	Pool           *pgxpool.Pool
	Q              *sqlcdb.Queries
	Issuer         auth.Issuer
	GoogleClientID string
	EventHub       *events.Hub
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

	// Initialize structured logger
	logger.Init()

	r := gin.New()

	// SECURITY MIDDLEWARE (ORDER MATTERS!)
	r.Use(middleware.RecoveryWithLogger()) // 1. Panic recovery with logging
	r.Use(middleware.RequestID())          // 2. Request ID for tracing (early for all logs)
	r.Use(middleware.CORS())               // 3. CORS before other handlers
	r.Use(middleware.SecurityHeaders())    // 4. Security headers on all responses
	r.Use(middleware.RateLimit())          // 5. General rate limiting
	r.Use(middleware.StructuredLogger())   // 6. Structured request logging

	// HTTPS enforcement in production
	if os.Getenv("GIN_MODE") == "release" {
		r.Use(middleware.EnforceHTTPS())
	}

	r.Match([]string{"GET", "HEAD"}, "/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.Match([]string{"GET", "HEAD"}, "/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	uploadSvc, err := services.NewUploadService()
	if err != nil {
		// Uploads are optional in dev/early deployments.
		uploadSvc = nil
	}

	v1 := r.Group("/v1")
	{
		ah := &handlers.AuthHandler{Q: deps.Q, Issuer: deps.Issuer, UploadService: uploadSvc, GoogleClientID: deps.GoogleClientID}

		// Auth routes with stricter rate limiting (5/15min for credential-based auth)
		authGroup := v1.Group("/auth")
		authGroup.Use(middleware.AuthRateLimit())
		authGroup.POST("/register", ah.Register)
		authGroup.POST("/login", ah.Login)
		authGroup.POST("/google", ah.GoogleAuth)
		authGroup.POST("/reset-request", ah.RequestPasswordReset)
		authGroup.POST("/reset", ah.ResetPassword)

		// Token refresh with more lenient rate limiting (30/15min)
		// Separate from login/register because refresh uses existing tokens
		refreshGroup := v1.Group("/auth")
		refreshGroup.Use(middleware.RefreshRateLimit())
		refreshGroup.POST("/refresh", ah.Refresh)

		// Authenticated profile routes (no additional rate limiting, uses general)
		authProfile := v1.Group("/auth")
		authProfile.GET("/me", auth.Middleware(deps.Issuer), ah.Me)
		authProfile.PATCH("/profile", auth.Middleware(deps.Issuer), ah.UpdateProfile)
		
		// Payment QR management
		paymentQRGroup := authProfile.Group("/payment-qr")
		paymentQRGroup.Use(auth.Middleware(deps.Issuer))
		{
			paymentQRGroup.GET("", ah.ListPaymentQRs)
			paymentQRGroup.POST("", ah.AddPaymentQR)
			paymentQRGroup.DELETE("/:id", ah.DeletePaymentQR)
			paymentQRGroup.PATCH("/:id/primary", ah.SetPrimaryPaymentQR)
		paymentQRGroup.PATCH("/:id/phone", ah.UpdatePaymentQRPhone)
		}

		v1.GET("/users/:id/profile", auth.Middleware(deps.Issuer), middleware.ProfileRateLimit(), ah.GetUserPublicProfile)

		gh := &handlers.GroupsHandler{Pool: deps.Pool, Q: deps.Q, Hub: deps.EventHub}
		groups := v1.Group("/groups", auth.Middleware(deps.Issuer))
		{
			groups.GET("", gh.List)
			groups.POST("", gh.Create)
			groups.GET("/:id", gh.Detail)
			groups.POST("/:id/invite", gh.CreateInvite)
			groups.POST("/join/:code", gh.JoinByCode)
			groups.DELETE("/:id/leave", gh.Leave)
			groups.DELETE("/:id/members/:userId", gh.RemoveMember)
			groups.GET("/:id/activity", (&handlers.ActivityHandler{Pool: deps.Pool, Q: deps.Q}).ListByGroup)
		}

		// Invite preview (public, no auth required)
		ih := &handlers.InvitesHandler{Pool: deps.Pool, Q: deps.Q}
		v1.GET("/invites/:code/preview", ih.Preview)

		// Start invite cleanup background job
		handlers.StartInviteCleanupJob(deps.Pool, deps.Q)

		// SSE events endpoint (no auth middleware - handles auth via query param)
		evh := &handlers.EventsHandler{Hub: deps.EventHub, Issuer: deps.Issuer, Q: deps.Q}
		v1.GET("/groups/:id/events", evh.Stream)

		eh := &handlers.ExpensesHandler{Pool: deps.Pool, Q: deps.Q, Hub: deps.EventHub}
		v1.GET("/groups/:id/expenses", auth.Middleware(deps.Issuer), eh.ListByGroup)
		v1.POST("/groups/:id/expenses", auth.Middleware(deps.Issuer), eh.CreateForGroup)
		v1.PATCH("/expenses/:id", auth.Middleware(deps.Issuer), eh.Update)
		v1.DELETE("/expenses/:id", auth.Middleware(deps.Issuer), eh.Delete)

		bh := &handlers.BalancesHandler{Q: deps.Q}
		v1.GET("/groups/:id/balances", auth.Middleware(deps.Issuer), bh.GetByGroup)

		ph := &handlers.PaymentsHandler{Pool: deps.Pool, Q: deps.Q, UploadService: uploadSvc, Hub: deps.EventHub}
		// Payments with stricter rate limiting
		payments := v1.Group("/payments", auth.Middleware(deps.Issuer))
		payments.Use(middleware.PaymentRateLimit())
		payments.POST("", ph.Create)
		payments.GET("", ph.List)
		payments.PATCH("/:id/approve", ph.Approve)
		payments.PATCH("/:id/reject", ph.Reject)
		payments.POST("/upload-proof", ph.UploadProof)

		nh := &handlers.NudgesHandler{Pool: deps.Pool, Q: deps.Q, Hub: deps.EventHub}
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
