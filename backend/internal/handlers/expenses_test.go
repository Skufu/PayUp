package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Skufu/PayUp/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestCreateExpense_SplitsMustSumToAmount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := &ExpensesHandler{}
	r := gin.New()
	r.POST("/v1/groups/:id/expenses", func(c *gin.Context) {
		// Simulate auth middleware
		c.Set(auth.CtxUserIDKey, uuid.New().String())
		h.CreateForGroup(c)
	})

	gid := uuid.New().String()
	payer := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/v1/groups/"+gid+"/expenses",
		strings.NewReader(`{"title":"x","amount":10.00,"payerId":"`+payer+`","splits":{"`+payer+`":9.00}}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected %d got %d: %s", http.StatusBadRequest, w.Code, w.Body.String())
	}
}
