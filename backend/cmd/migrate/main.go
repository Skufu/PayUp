package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("usage: %s <goose-command> [args...]", os.Args[0])
	}

	// Load local env files for developer convenience.
	// In production, these files won't exist, and that's fine.
	_ = godotenv.Load("../.env", ".env")

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required (e.g. postgres://user:pass@host/db?sslmode=require)")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("set dialect: %v", err)
	}

	migrationsDir := filepath.Join(".", "migrations")

	cmd := os.Args[1]
	args := os.Args[2:]
	if err := goose.RunContext(context.Background(), cmd, db, migrationsDir, args...); err != nil {
		log.Fatalf("goose %s: %v", cmd, err)
	}
}
