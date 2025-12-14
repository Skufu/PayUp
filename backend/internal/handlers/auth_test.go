package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type stubDBTX struct {
	queryRow func(ctx context.Context, sql string, args ...any) pgx.Row
}

func (s stubDBTX) Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}

func (s stubDBTX) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return nil, nil
}

func (s stubDBTX) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return s.queryRow(ctx, sql, args...)
}

type stubRow struct {
	scan func(dest ...any) error
}

func (r stubRow) Scan(dest ...any) error { return r.scan(dest...) }

func TestAuthRegister_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Now().UTC()
	userID := uuid.New()

	q := sqlcdb.New(stubDBTX{queryRow: func(ctx context.Context, sql string, args ...any) pgx.Row {
		return stubRow{scan: func(dest ...any) error {
			// RETURNING id, email, name, avatar_url, qr_url, created_at, updated_at
			*(dest[0].(*pgtype.UUID)) = sqlcutil.UUID(userID)
			*(dest[1].(*string)) = "test@example.com"
			*(dest[2].(**string)) = nil
			*(dest[3].(**string)) = nil
			*(dest[4].(**string)) = nil
			*(dest[5].(*pgtype.Timestamptz)) = pgtype.Timestamptz{Time: now, Valid: true}
			*(dest[6].(*pgtype.Timestamptz)) = pgtype.Timestamptz{Time: now, Valid: true}
			return nil
		}}
	}})

	h := &AuthHandler{
		Q: q,
		Issuer: auth.Issuer{
			Secret:          []byte("unit-test-secret"),
			AccessTokenTTL:  time.Minute,
			RefreshTokenTTL: time.Hour,
		},
	}

	r := gin.New()
	r.POST("/v1/auth/register", h.Register)

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register",
		strings.NewReader(`{"email":"test@example.com","password":"password123"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected %d got %d: %s", http.StatusCreated, w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "\"accessToken\"") {
		t.Fatalf("expected accessToken in response: %s", w.Body.String())
	}
}

func TestAuthRegister_DuplicateEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)

	q := sqlcdb.New(stubDBTX{queryRow: func(ctx context.Context, sql string, args ...any) pgx.Row {
		return stubRow{scan: func(dest ...any) error {
			return &pgconn.PgError{Code: "23505"}
		}}
	}})

	h := &AuthHandler{
		Q:      q,
		Issuer: auth.Issuer{Secret: []byte("unit-test-secret"), AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour},
	}

	r := gin.New()
	r.POST("/v1/auth/register", h.Register)

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register",
		strings.NewReader(`{"email":"test@example.com","password":"password123"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected %d got %d: %s", http.StatusConflict, w.Code, w.Body.String())
	}
}
