package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string

	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
}

func Load() Config {
	// Dev convenience: load env files if present.
	// This is safe in production where these files won't exist.
	_ = godotenv.Load("../.env", ".env")

	cfg := Config{
		Port:               getenv("PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		AccessTokenTTL:     15 * time.Minute,
		RefreshTokenTTL:    30 * 24 * time.Hour,
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
	}

	if mins := os.Getenv("ACCESS_TOKEN_TTL_MINUTES"); mins != "" {
		if n, err := strconv.Atoi(mins); err == nil && n > 0 {
			cfg.AccessTokenTTL = time.Duration(n) * time.Minute
		}
	}
	if hours := os.Getenv("REFRESH_TOKEN_TTL_HOURS"); hours != "" {
		if n, err := strconv.Atoi(hours); err == nil && n > 0 {
			cfg.RefreshTokenTTL = time.Duration(n) * time.Hour
		}
	}

	return cfg
}

func getenv(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}
