package handlers

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Skufu/PayUp/internal/db/sqlcdb"
	"github.com/Skufu/PayUp/internal/db/sqlcutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestAuthUpdateProfile_NameOnly_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	uid := uuid.New()
	q := sqlcdb.New(stubDBTX{
		queryRow: func(ctx context.Context, sql string, args ...any) pgx.Row {
			t.Fatalf("unexpected QueryRow in UpdateProfile")
			return nil
		},
	})

	h := &AuthHandler{Q: q}

	r := gin.New()
	// Stub auth: set user id on context.
	r.PATCH("/v1/auth/profile", func(c *gin.Context) {
		c.Set("userID", uid.String())
		c.Next()
	}, h.UpdateProfile)

	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	_ = w.WriteField("name", "New Name")
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPatch, "/v1/auth/profile", body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected %d got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}
}

func TestAuthUpdateProfile_QRFile_NoUploadService_503(t *testing.T) {
	gin.SetMode(gin.TestMode)

	uid := uuid.New()
	q := sqlcdb.New(stubDBTX{queryRow: func(ctx context.Context, sql string, args ...any) pgx.Row {
		return stubRow{scan: func(dest ...any) error { return nil }}
	}})
	h := &AuthHandler{Q: q, UploadService: nil}

	r := gin.New()
	r.PATCH("/v1/auth/profile", func(c *gin.Context) {
		c.Set("userID", uid.String())
		c.Next()
	}, h.UpdateProfile)

	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	fw, err := w.CreateFormFile("payment_qr", "qr.png")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write([]byte("fakepng"))
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPatch, "/v1/auth/profile", body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d got %d: %s", http.StatusServiceUnavailable, rr.Code, rr.Body.String())
	}
}

func TestAuthGetUserPublicProfile_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Now().UTC()
	uid := uuid.New()
	name := "Alice"
	avatar := "https://example.com/a.png"
	qr := "https://example.com/qr.png"

	q := sqlcdb.New(stubDBTX{queryRow: func(ctx context.Context, sql string, args ...any) pgx.Row {
		return stubRow{scan: func(dest ...any) error {
			// id, name, avatar_url, qr_url
			*(dest[0].(*pgtype.UUID)) = sqlcutil.UUID(uid)
			*(dest[1].(**string)) = &name
			*(dest[2].(**string)) = &avatar
			*(dest[3].(**string)) = &qr
			_ = now
			return nil
		}}
	}})

	h := &AuthHandler{Q: q}

	r := gin.New()
	r.GET("/v1/users/:id/profile", h.GetUserPublicProfile)

	req := httptest.NewRequest(http.MethodGet, "/v1/users/"+uid.String()+"/profile", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected %d got %d: %s", http.StatusOK, rr.Code, rr.Body.String())
	}
	if !bytes.Contains(rr.Body.Bytes(), []byte("qrUrl")) {
		t.Fatalf("expected qrUrl in response: %s", rr.Body.String())
	}
}

func TestPaymentsUploadProof_NoUploadService_503(t *testing.T) {
	gin.SetMode(gin.TestMode)

	uid := uuid.New()
	h := &PaymentsHandler{UploadService: nil}

	r := gin.New()
	r.POST("/v1/payments/upload-proof", func(c *gin.Context) {
		c.Set("userID", uid.String())
		c.Next()
	}, h.UploadProof)

	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	fw, err := w.CreateFormFile("proof", "receipt.jpg")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write([]byte("fakejpg"))
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPost, "/v1/payments/upload-proof", body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d got %d: %s", http.StatusServiceUnavailable, rr.Code, rr.Body.String())
	}
}


