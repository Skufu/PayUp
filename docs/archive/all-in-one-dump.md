

```markdown
# PayUp Security Implementation Guide

This document contains all security fixes and enhancements needed before launching PayUp to your friends.

---

## 🚨 Critical Security Fixes (Must Implement Today)

### 1. Rate Limiting

**Install dependencies:**
```

cd backend
go get github.com/ulule/limiter/v3
go get github.com/ulule/limiter/v3/drivers/store/memory

```

**Create `backend/internal/middleware/ratelimit.go`:**
```

package middleware

import (
"time"

    "github.com/gin-gonic/gin"
    "github.com/ulule/limiter/v3"
    mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
    "github.com/ulule/limiter/v3/drivers/store/memory"
    )

// RateLimit creates a general rate limiter (5 req/sec per IP)
func RateLimit() gin.HandlerFunc {
rate := limiter.Rate{
Period: 1 * time.Second,
Limit:  5,
}
store := memory.NewStore()
instance := limiter.New(store, rate)

    return mgin.NewMiddleware(instance)
    }

// AuthRateLimit creates stricter limits for auth endpoints
func AuthRateLimit() gin.HandlerFunc {
// 5 attempts per 15 minutes
rate := limiter.Rate{
Period: 15 * time.Minute,
Limit:  5,
}
store := memory.NewStore()
instance := limiter.New(store, rate)

    return mgin.NewMiddleware(instance)
    }

// PaymentRateLimit for payment submissions
func PaymentRateLimit() gin.HandlerFunc {
// 10 payments per hour
rate := limiter.Rate{
Period: 1 * time.Hour,
Limit:  10,
}
store := memory.NewStore()
instance := limiter.New(store, rate)

    return mgin.NewMiddleware(instance)
    }

```

---

### 2. CORS Configuration

**Install dependency:**
```

cd backend
go get github.com/gin-contrib/cors

```

**Create `backend/internal/middleware/cors.go`:**
```

package middleware

import (
"time"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    )

func CORS() gin.HandlerFunc {
return cors.New(cors.Config{
AllowOrigins: []string{
"http://localhost:5173",           // Local dev
"https://payup.vercel.app",        // Production frontend
"https://www.payup.app",           // Custom domain if you have one
},
AllowMethods: []string{
"GET",
"POST",
"PUT",
"PATCH",
"DELETE",
"OPTIONS",
},
AllowHeaders: []string{
"Origin",
"Content-Type",
"Authorization",
"Accept",
},
ExposeHeaders: []string{
"Content-Length",
},
AllowCredentials: true,
MaxAge:           12 * time.Hour,
})
}

```

**Update `backend/internal/server/router.go`:**
```

package server

import (
"github.com/Skufu/PayUp/internal/handlers"
"github.com/Skufu/PayUp/internal/middleware"
"github.com/gin-gonic/gin"
)

func New(deps Deps) *gin.Engine {
r := gin.Default()

    // SECURITY MIDDLEWARE (ORDER MATTERS!)
    r.Use(middleware.CORS())            // 1. CORS first
    r.Use(middleware.RateLimit())       // 2. General rate limiting
    r.Use(middleware.SecurityHeaders()) // 3. Security headers (see below)
    
    // Health check (no auth required)
    r.GET("/health", func(c *gin.Context) {
    	c.JSON(200, gin.H{"status": "ok"})
    })
    
    // Auth routes with stricter rate limiting
    auth := r.Group("/v1/auth")
    auth.Use(middleware.AuthRateLimit())
    {
    	authHandler := handlers.NewAuthHandler(deps.Q, deps.Issuer)
    	auth.POST("/register", authHandler.Register)
    	auth.POST("/login", authHandler.Login)
    	auth.POST("/refresh", authHandler.Refresh)
    	
    	// Protected auth routes
    	authProtected := auth.Group("")
    	authProtected.Use(middleware.RequireAuth(deps.Issuer))
    	{
    		authProtected.GET("/me", authHandler.Me)
    	}
    }
    
    // Protected API routes
    api := r.Group("/v1")
    api.Use(middleware.RequireAuth(deps.Issuer))
    {
    	// Groups
    	groupsHandler := handlers.NewGroupsHandler(deps.Q, deps.Pool)
    	api.GET("/groups", groupsHandler.List)
    	api.POST("/groups", groupsHandler.Create)
    	api.GET("/groups/:id", groupsHandler.Detail)
    	api.POST("/groups/:id/invite", groupsHandler.CreateInvite)
    	api.POST("/groups/join/:code", groupsHandler.JoinByCode)
    
    	// Expenses
    	expensesHandler := handlers.NewExpensesHandler(deps.Q, deps.Pool)
    	api.GET("/groups/:id/expenses", expensesHandler.List)
    	api.POST("/groups/:id/expenses", expensesHandler.Create)
    	api.DELETE("/expenses/:id", expensesHandler.Delete)
    
    	// Balances
    	balancesHandler := handlers.NewBalancesHandler(deps.Q)
    	api.GET("/groups/:id/balances", balancesHandler.GetByGroup)
    
    	// Payments
    	paymentsHandler := handlers.NewPaymentsHandler(deps.Q, deps.Pool)
    	paymentsGroup := api.Group("/payments")
    	paymentsGroup.Use(middleware.PaymentRateLimit())
    	{
    		paymentsGroup.POST("", paymentsHandler.Create)
    		paymentsGroup.GET("", paymentsHandler.List)
    		paymentsGroup.PATCH("/:id/approve", paymentsHandler.Approve)
    		paymentsGroup.PATCH("/:id/reject", paymentsHandler.Reject)
    	}
    }
    
    return r
    }

```

---

### 3. Security Headers

**Create `backend/internal/middleware/security.go`:**
```

package middleware

import (
"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
return func(c *gin.Context) {
// Prevent clickjacking
c.Header("X-Frame-Options", "DENY")

    	// Prevent MIME type sniffing
    	c.Header("X-Content-Type-Options", "nosniff")
    	
    	// Enable XSS protection
    	c.Header("X-XSS-Protection", "1; mode=block")
    	
    	// Referrer policy
    	c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
    	
    	// Content Security Policy (adjust as needed)
    	c.Header("Content-Security-Policy", "default-src 'self'")
    	
    	// Force HTTPS in production
    	if c.GetHeader("X-Forwarded-Proto") == "https" {
    		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    	}
    	
    	c.Next()
    }
    }

```

---

### 4. Input Validation

**Install validator:**
```

cd backend
go get github.com/go-playground/validator/v10

```

**Create `backend/internal/handlers/validation.go`:**
```

package handlers

import (
"errors"
"regexp"
"unicode"

    "github.com/go-playground/validator/v10"
    )

var validate = validator.New()
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// Request structs with validation tags
type RegisterRequest struct {
Email    string `json:"email" validate:"required,email,max=255"`
Password string `json:"password" validate:"required,min=8,max=72"`
Name     string `json:"name" validate:"required,min=1,max=100"`
}

type LoginRequest struct {
Email    string `json:"email" validate:"required,email"`
Password string `json:"password" validate:"required"`
}

type CreateGroupRequest struct {
Name string `json:"name" validate:"required,min=1,max=100"`
}

type CreateExpenseRequest struct {
Title  string  `json:"title" validate:"required,min=1,max=200"`
Amount float64 `json:"amount" validate:"required,gt=0,lte=1000000"`
}

type CreatePaymentRequest struct {
ReceiverID string  `json:"receiver_id" validate:"required,uuid"`
Amount     float64 `json:"amount" validate:"required,gt=0,lte=1000000"`
ProofURL   string  `json:"proof_url" validate:"omitempty,url,max=500"`
}

// Validation functions
func ValidateEmail(email string) bool {
if len(email) > 255 {
return false
}
return emailRegex.MatchString(email)
}

func ValidatePassword(password string) error {
if len(password) < 8 {
return errors.New("password must be at least 8 characters")
}
if len(password) > 72 {
return errors.New("password too long (max 72 characters)")
}
return nil
}

// For production (stricter):
func ValidatePasswordStrength(password string) error {
var (
hasUpper   = false
hasLower   = false
hasNumber  = false
hasSpecial = false
)

    if len(password) < 12 {
    	return errors.New("password must be at least 12 characters")
    }
    
    for _, char := range password {
    	switch {
    	case unicode.IsUpper(char):
    		hasUpper = true
    	case unicode.IsLower(char):
    		hasLower = true
    	case unicode.IsNumber(char):
    		hasNumber = true
    	case unicode.IsPunct(char) || unicode.IsSymbol(char):
    		hasSpecial = true
    	}
    }
    
    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
    	return errors.New("password must contain uppercase, lowercase, number, and special character")
    }
    
    return nil
    }

func ValidateUUID(id string) bool {
uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
return uuidRegex.MatchString(id)
}

```

**Update auth handlers to use validation:**
```

// backend/internal/handlers/auth.go
func (h *AuthHandler) Register(c *gin.Context) {
var req RegisterRequest
if err := c.ShouldBindJSON(\&req); err != nil {
c.JSON(400, gin.H{"error": "invalid request format"})
return
}

    // Validate struct
    if err := validate.Struct(req); err != nil {
    	c.JSON(400, gin.H{"error": "validation failed", "details": err.Error()})
    	return
    }
    
    // Additional email validation
    if !ValidateEmail(req.Email) {
    	c.JSON(400, gin.H{"error": "invalid email format"})
    	return
    }
    
    // Validate password (use ValidatePassword for beta, ValidatePasswordStrength for production)
    if err := ValidatePassword(req.Password); err != nil {
    	c.JSON(400, gin.H{"error": err.Error()})
    	return
    }
    
    // Sanitize name (remove leading/trailing whitespace)
    req.Name = strings.TrimSpace(req.Name)
    
    // Continue with registration...
    }

```

---

### 5. Authorization Middleware

**Create `backend/internal/middleware/auth.go`:**
```

package middleware

import (
"strings"

    "github.com/Skufu/PayUp/internal/auth"
    "github.com/gin-gonic/gin"
    )

func RequireAuth(issuer auth.Issuer) gin.HandlerFunc {
return func(c *gin.Context) {
// Extract token from Authorization header
authHeader := c.GetHeader("Authorization")
if authHeader == "" {
c.JSON(401, gin.H{"error": "missing authorization header"})
c.Abort()
return
}

    	// Check Bearer prefix
    	parts := strings.SplitN(authHeader, " ", 2)
    	if len(parts) != 2 || parts != "Bearer" {
    		c.JSON(401, gin.H{"error": "invalid authorization format"})
    		c.Abort()
    		return
    	}
    
    	tokenString := parts[^1]
    
    	// Validate token
    	claims, err := issuer.ValidateToken(tokenString)
    	if err != nil {
    		c.JSON(401, gin.H{"error": "invalid or expired token"})
    		c.Abort()
    		return
    	}
    
    	// Store user info in context for handlers to use
    	c.Set("user_id", claims.UserID)
    	c.Set("user_email", claims.Email)
    
    	c.Next()
    }
    }

```

---

### 6. Authorization Checks in Handlers

**Example: Expenses Delete with Authorization:**
```

// backend/internal/handlers/expenses.go
func (h *ExpensesHandler) Delete(c *gin.Context) {
// Get authenticated user from middleware
userID, exists := c.Get("user_id")
if !exists {
c.JSON(401, gin.H{"error": "unauthorized"})
return
}

    expenseID := c.Param("id")
    
    // Validate UUID
    if !ValidateUUID(expenseID) {
    	c.JSON(400, gin.H{"error": "invalid expense ID"})
    	return
    }
    
    // Get the expense
    expense, err := h.q.GetExpense(c.Request.Context(), uuid.MustParse(expenseID))
    if err != nil {
    	c.JSON(404, gin.H{"error": "expense not found"})
    	return
    }
    
    // CRITICAL: Check if user created this expense
    if expense.CreatedBy.String() != userID.(string) {
    	c.JSON(403, gin.H{"error": "you can only delete your own expenses"})
    	return
    }
    
    // Now safe to delete
    err = h.q.DeleteExpense(c.Request.Context(), expense.ID)
    if err != nil {
    	c.JSON(500, gin.H{"error": "failed to delete expense"})
    	return
    }
    
    c.JSON(200, gin.H{"message": "expense deleted"})
    }

```

**Example: Groups Detail with Membership Check:**
```

func (h *GroupsHandler) Detail(c *gin.Context) {
userID, _ := c.Get("user_id")
groupID := c.Param("id")

    if !ValidateUUID(groupID) {
    	c.JSON(400, gin.H{"error": "invalid group ID"})
    	return
    }
    
    // Check if user is a member of this group
    isMember, err := h.q.IsGroupMember(c.Request.Context(), sqlcdb.IsGroupMemberParams{
    	GroupID: uuid.MustParse(groupID),
    	UserID:  uuid.MustParse(userID.(string)),
    })
    
    if err != nil || !isMember {
    	c.JSON(403, gin.H{"error": "you are not a member of this group"})
    	return
    }
    
    // Now safe to return group details
    group, err := h.q.GetGroup(c.Request.Context(), uuid.MustParse(groupID))
    // ... return group
    }

```

**Add this query to `backend/sql/queries/groups.sql`:**
```

-- name: IsGroupMember :one
SELECT EXISTS(
SELECT 1 FROM group_members
WHERE group_id = \$1 AND user_id = \$2
);

```

---

### 7. Enhanced JWT Implementation

**Update `backend/internal/auth/issuer.go`:**
```

package auth

import (
"errors"
"fmt"
"time"

    "github.com/golang-jwt/jwt/v5"
    )

type Issuer struct {
Secret          []byte
AccessTokenTTL  time.Duration
RefreshTokenTTL time.Duration
}

type Claims struct {
UserID    string `json:"user_id"`
Email     string `json:"email"`
TokenType string `json:"token_type"` // "access" or "refresh"
jwt.RegisteredClaims
}

func (i *Issuer) GenerateAccessToken(userID, email string) (string, error) {
now := time.Now()
claims := Claims{
UserID:    userID,
Email:     email,
TokenType: "access",
RegisteredClaims: jwt.RegisteredClaims{
Issuer:    "payup-api",
Subject:   userID,
IssuedAt:  jwt.NewNumericDate(now),
ExpiresAt: jwt.NewNumericDate(now.Add(i.AccessTokenTTL)),
NotBefore: jwt.NewNumericDate(now),
},
}

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(i.Secret)
    }

func (i *Issuer) GenerateRefreshToken(userID, email string) (string, error) {
now := time.Now()
claims := Claims{
UserID:    userID,
Email:     email,
TokenType: "refresh",
RegisteredClaims: jwt.RegisteredClaims{
Issuer:    "payup-api",
Subject:   userID,
IssuedAt:  jwt.NewNumericDate(now),
ExpiresAt: jwt.NewNumericDate(now.Add(i.RefreshTokenTTL)),
NotBefore: jwt.NewNumericDate(now),
},
}

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(i.Secret)
    }

func (i *Issuer) ValidateToken(tokenString string) (*Claims, error) {
token, err := jwt.ParseWithClaims(tokenString, \&Claims{}, func(token *jwt.Token) (interface{}, error) {
// Verify signing method to prevent algorithm confusion attacks
if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
}
return i.Secret, nil
})

    if err != nil {
    	return nil, err
    }
    
    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
    	return nil, errors.New("invalid token")
    }
    
    // Verify it's an access token (not refresh)
    if claims.TokenType != "access" {
    	return nil, errors.New("wrong token type")
    }
    
    return claims, nil
    }

func (i *Issuer) ValidateRefreshToken(tokenString string) (*Claims, error) {
token, err := jwt.ParseWithClaims(tokenString, \&Claims{}, func(token *jwt.Token) (interface{}, error) {
if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
}
return i.Secret, nil
})

    if err != nil {
    	return nil, err
    }
    
    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
    	return nil, errors.New("invalid token")
    }
    
    // Verify it's a refresh token
    if claims.TokenType != "refresh" {
    	return nil, errors.New("wrong token type")
    }
    
    return claims, nil
    }

```

---

### 8. Secure Token Storage (Frontend)

**Create `frontend/src/lib/auth/tokenStorage.ts`:**
```

const ACCESS_TOKEN_KEY = 'payup_access_token';
const REFRESH_TOKEN_KEY = 'payup_refresh_token';

export const tokenStorage = {
// Store tokens
setTokens(accessToken: string, refreshToken: string) {
// Access token in sessionStorage (cleared on tab close)
sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    // Refresh token in localStorage (persists)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },

// Get access token
getAccessToken(): string | null {
return sessionStorage.getItem(ACCESS_TOKEN_KEY);
},

// Get refresh token
getRefreshToken(): string | null {
return localStorage.getItem(REFRESH_TOKEN_KEY);
},

// Clear all tokens (logout)
clear() {
sessionStorage.removeItem(ACCESS_TOKEN_KEY);
localStorage.removeItem(REFRESH_TOKEN_KEY);
},

// Check if user is authenticated
isAuthenticated(): boolean {
return !!this.getAccessToken() || !!this.getRefreshToken();
}
};

```

**Update API client to use tokens:**
```

// frontend/src/lib/api/client.ts
import { tokenStorage } from '../auth/tokenStorage';

export async function apiCall<T>(
endpoint: string,
options: RequestInit = {}
): Promise<T> {
const token = tokenStorage.getAccessToken();

const headers: HeadersInit = {
'Content-Type': 'application/json',
...options.headers,
};

// Add auth header if token exists
if (token) {
headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch(endpoint, {
...options,
headers,
});

// Handle 401 - try to refresh token
if (response.status === 401) {
const refreshed = await refreshAccessToken();
if (refreshed) {
// Retry original request with new token
headers['Authorization'] = `Bearer ${tokenStorage.getAccessToken()}`;
const retryResponse = await fetch(endpoint, { ...options, headers });
if (!retryResponse.ok) {
throw new Error('Request failed after token refresh');
}
return retryResponse.json();
} else {
// Refresh failed, logout user
tokenStorage.clear();
window.location.href = '/login';
throw new Error('Session expired');
}
}

if (!response.ok) {
const error = await response.json().catch(() => ({ error: 'Unknown error' }));
throw new Error(error.error || 'Request failed');
}

return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
const refreshToken = tokenStorage.getRefreshToken();
if (!refreshToken) return false;

try {
const response = await fetch('/v1/auth/refresh', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ refresh_token: refreshToken }),
});

    if (!response.ok) return false;
    
    const data = await response.json();
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return true;
    } catch {
return false;
}
}

```

---

### 9. XSS Protection (Frontend)

**Install DOMPurify:**
```

cd frontend
npm install dompurify
npm install @types/dompurify -D

```

**Create `frontend/src/lib/utils/sanitize.ts`:**
```

import DOMPurify from 'dompurify';

// Sanitize HTML to prevent XSS
export function sanitizeHTML(dirty: string): string {
return DOMPurify.sanitize(dirty, {
ALLOWED_TAGS: [], // No HTML tags allowed
ALLOWED_ATTR: [],
});
}

// Sanitize and allow safe HTML (links, bold, etc.)
export function sanitizeRichText(dirty: string): string {
return DOMPurify.sanitize(dirty, {
ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
ALLOWED_ATTR: ['href', 'target', 'rel'],
});
}

// Escape for use in URLs
export function sanitizeURL(url: string): string {
try {
const parsed = new URL(url);
// Only allow http/https
if (!['http:', 'https:'].includes(parsed.protocol)) {
return '';
}
return parsed.toString();
} catch {
return '';
}
}

```

**Use in components:**
```

// When displaying user input
import { sanitizeHTML } from '@/lib/utils/sanitize';

function ExpenseItem({ expense }: { expense: Expense }) {
return (
<div>
{/* React auto-escapes by default, but can sanitize for extra safety */}
<h3>{expense.title}</h3>

      {/* If rendering HTML from user input, ALWAYS sanitize: */}
      <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(expense.notes) }} />
    </div>
    );
}

```

---

### 10. Environment Variables Security

**Verify `.gitignore` includes:**
```


# Environment variables

.env
.env.local
.env.production
.env.*.local
*.env

# Backend

backend/.env
backend/.env.*

# Frontend

frontend/.env
frontend/.env.*

```

**Create `.env.example` files:**

**Backend `.env.example`:**
```

PORT=8000
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require
GIN_MODE=debug
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_HOURS=720

```

**Frontend `.env.example`:**
```

VITE_API_URL=http://localhost:8000

```

**Generate secure JWT secret:**
```


# On Mac/Linux/WSL:

openssl rand -base64 32

# Or in Node.js:

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

```

---

### 11. HTTPS Enforcement (Production)

**Create `backend/internal/middleware/https.go`:**
```

package middleware

import (
"net/http"
"os"

    "github.com/gin-gonic/gin"
    )

func EnforceHTTPS() gin.HandlerFunc {
return func(c *gin.Context) {
// Only enforce in production
if os.Getenv("GIN_MODE") != "release" {
c.Next()
return
}

    	// Check if request came through HTTPS (behind reverse proxy)
    	if c.Request.Header.Get("X-Forwarded-Proto") != "https" {
    		httpsURL := "https://" + c.Request.Host + c.Request.RequestURI
    		c.Redirect(http.StatusMovedPermanently, httpsURL)
    		c.Abort()
    		return
    	}
    
    	c.Next()
    }
    }

```

**Add to router (production only):**
```

if os.Getenv("GIN_MODE") == "release" {
r.Use(middleware.EnforceHTTPS())
}

```

---

### 12. Logging & Monitoring

**Install Zap logger:**
```

cd backend
go get go.uber.org/zap

```

**Create `backend/internal/middleware/logger.go`:**
```

package middleware

import (
"time"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
    )

func Logger(logger *zap.Logger) gin.HandlerFunc {
return func(c *gin.Context) {
start := time.Now()
path := c.Request.URL.Path
query := c.Request.URL.RawQuery

    	c.Next()
    
    	// Log request details
    	logger.Info("request",
    		zap.String("method", c.Request.Method),
    		zap.String("path", path),
    		zap.String("query", query),
    		zap.Int("status", c.Writer.Status()),
    		zap.Duration("latency", time.Since(start)),
    		zap.String("ip", c.ClientIP()),
    		zap.String("user_agent", c.Request.UserAgent()),
    		zap.Int("body_size", c.Writer.Size()),
    	)
    
    	// Log errors
    	if len(c.Errors) > 0 {
    		for _, e := range c.Errors {
    			logger.Error("request error",
    				zap.String("error", e.Error()),
    				zap.String("path", path),
    			)
    		}
    	}
    }
    }

```

**Update `cmd/api/main.go`:**
```

import "go.uber.org/zap"

func main() {
_ = godotenv.Load()

    // Initialize logger
    logger, _ := zap.NewProduction()
    defer logger.Sync()
    
    cfg := config.Load()
    // ... rest of setup
    
    srv := &http.Server{
    	Addr:    ":" + cfg.Port,
    	Handler: server.New(server.Deps{
    		Pool:   pool,
    		Q:      q,
    		Issuer: issuer,
    		Logger: logger, // Pass logger to server
    	}),
    	ReadHeaderTimeout: 5 * time.Second,
    }
    
    // ... rest
    }

```

**Add Sentry for error tracking (optional but recommended):**
```

cd frontend
npm install @sentry/react

```

```

// frontend/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
dsn: import.meta.env.VITE_SENTRY_DSN,
environment: import.meta.env.MODE,
enabled: import.meta.env.PROD, // Only in production
tracesSampleRate: 0.1,
});

```

---

## 🚀 Quick Implementation Checklist

### Day 1 (Critical - Must Do Before Friends Use)
- [ ] Add rate limiting middleware
- [ ] Configure CORS properly
- [ ] Add security headers
- [ ] Add input validation to auth endpoints
- [ ] Implement authorization checks in expense delete
- [ ] Add RequireAuth middleware
- [ ] Verify `.env` files not in git
- [ ] Test with curl/Postman

### Day 2 (Important - Before Public Launch)
- [ ] Add validation to all endpoints
- [ ] Implement group membership checks
- [ ] Add payment approval authorization
- [ ] Secure token storage in frontend
- [ ] Add XSS sanitization
- [ ] Set up error logging
- [ ] Test authorization with 2+ users

### Day 3 (Nice to Have)
- [ ] Add password strength requirements
- [ ] Implement HTTPS enforcement
- [ ] Set up Sentry error tracking
- [ ] Add structured logging
- [ ] Create security headers
- [ ] Write security tests

---

## 🧪 Testing Security

**Test rate limiting:**
```


# Should succeed 5 times, then block

for i in {1..10}; do
curl -X POST http://localhost:8000/v1/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@test.com","password":"wrong"}'
sleep 0.5
done

```

**Test authorization:**
```


# Try to delete another user's expense (should get 403)

curl -X DELETE http://localhost:8000/v1/expenses/OTHER_USER_EXPENSE_ID \
-H "Authorization: Bearer YOUR_TOKEN"

```

**Test CORS:**
```


# From browser console on different origin:

fetch('http://localhost:8000/v1/auth/me')
// Should fail with CORS error

```

**Test token expiration:**
```


# Use old/expired token (should get 401)

curl http://localhost:8000/v1/auth/me \
-H "Authorization: Bearer EXPIRED_TOKEN"

```

---

## 📊 Security Monitoring Checklist

### After Launch
- [ ] Monitor Sentry for errors
- [ ] Check logs for unusual activity
- [ ] Review failed login attempts
- [ ] Monitor rate limit hits
- [ ] Check for SQL injection attempts
- [ ] Review API usage patterns

### Weekly
- [ ] Update dependencies (`go get -u`, `npm update`)
- [ ] Check for security advisories
- [ ] Review access logs
- [ ] Test backup/restore process

### Monthly
- [ ] Rotate JWT secret (if compromised)
- [ ] Audit user accounts
- [ ] Review permission levels
- [ ] Check database performance

---

## 🔑 Production Environment Variables

**Render (Backend):**
```

DATABASE_URL=postgres://user:pass@neon.tech/payup?sslmode=require
JWT_SECRET=<generate-with-openssl-rand-base64-32>
GIN_MODE=release
PORT=8000
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_HOURS=168

```

**Vercel (Frontend):**
```

VITE_API_URL=https://payup-api.onrender.com
VITE_SENTRY_DSN=<your-sentry-dsn>

```

---

## ✅ Final Security Checklist Before Launch

- [ ] Rate limiting enabled on all routes
- [ ] CORS restricted to your domains only
- [ ] All endpoints validate input
- [ ] Authorization checks on protected routes
- [ ] Tokens stored securely (sessionStorage/localStorage)
- [ ] HTTPS enforced in production
- [ ] Environment variables not in git
- [ ] Error tracking configured (Sentry)
- [ ] Logs don't expose sensitive data
- [ ] Password hashing with bcrypt
- [ ] SQL injection protection (sqlc)
- [ ] XSS protection enabled
- [ ] Security headers configured
- [ ] Tested with 2+ users
- [ ] Backup strategy in place

---

## 🆘 Security Incident Response

**If you detect suspicious activity:**

1. **Immediate:** Rotate JWT_SECRET (forces all users to re-login)
2. **Check logs** for affected users/data
3. **Notify affected users** if data was accessed
4. **Fix vulnerability** and redeploy
5. **Document incident** for future reference

**Emergency JWT rotation:**
```


# Generate new secret

openssl rand -base64 32

# Update in Render environment variables

# All users will need to login again

```

---

## How We’ll Work Through This

1. Start at **Section 1**, complete all tasks, and check off boxes.
2. When a section is done, move to the next.
3. If scope feels too big, we’ll split a section into smaller subtasks.
4. Update this file as the source of truth for progress and decisions.

Next step: **start with Section 1 – Project Structure & Repos.**
