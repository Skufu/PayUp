package db

import (
	"context"
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute

	// Default to 25 connections, configurable via DB_MAX_CONNS
	maxConns := 25
	if maxConnsStr := os.Getenv("DB_MAX_CONNS"); maxConnsStr != "" {
		if n, err := strconv.Atoi(maxConnsStr); err == nil && n > 0 {
			maxConns = n
		}
	}
	cfg.MaxConns = int32(maxConns)

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}
