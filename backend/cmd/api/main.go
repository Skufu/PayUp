package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/config"
	"github.com/Skufu/PayUp/internal/db"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/events"
	"github.com/Skufu/PayUp/internal/logger"
	"github.com/Skufu/PayUp/internal/server"
)

func main() {
	// Initialize logger early
	logger.Init()

	cfg := config.Load()
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = randomDevSecret()
		logger.Warn("JWT_SECRET not set; using ephemeral dev secret")
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", logger.Fields{"error": err.Error()})
		os.Exit(1)
	}
	defer pool.Close()

	issuer := auth.Issuer{
		Secret:          []byte(cfg.JWTSecret),
		AccessTokenTTL:  cfg.AccessTokenTTL,
		RefreshTokenTTL: cfg.RefreshTokenTTL,
	}

	q := sqlcdb.New(pool)

	// Initialize SSE event hub
	eventHub := events.NewHub()

	srv := &http.Server{
		Addr: ":" + cfg.Port,
		Handler: server.New(server.Deps{
			Pool:           pool,
			Q:              q,
			Issuer:         issuer,
			GoogleClientID: cfg.GoogleClientID,
			EventHub:       eventHub,
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("api started", logger.Fields{"port": cfg.Port, "addr": "http://localhost:" + cfg.Port})
		errCh <- srv.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case sig := <-stop:
		logger.Info("shutdown initiated", logger.Fields{"signal": sig.String()})
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", logger.Fields{"error": err.Error()})
			os.Exit(1)
		}
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", logger.Fields{"error": err.Error()})
	}
}

func randomDevSecret() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		// Last resort: still produce a non-empty value.
		return "dev-secret"
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
