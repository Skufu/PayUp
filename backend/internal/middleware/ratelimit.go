package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// rateLimiter implements a simple in-memory rate limiter using token bucket algorithm.
type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int           // requests allowed per period
	period   time.Duration // time period
}

type visitor struct {
	tokens    int
	lastReset time.Time
}

func newRateLimiter(rate int, period time.Duration) *rateLimiter {
	rl := &rateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		period:   period,
	}
	// Cleanup old entries every minute
	go rl.cleanup()
	return rl
}

func (rl *rateLimiter) cleanup() {
	for {
		time.Sleep(time.Minute)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastReset) > rl.period*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{
			tokens:    rl.rate - 1,
			lastReset: time.Now(),
		}
		return true
	}

	// Reset tokens if period has passed
	if time.Since(v.lastReset) > rl.period {
		v.tokens = rl.rate - 1
		v.lastReset = time.Now()
		return true
	}

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// RateLimit creates a general rate limiter (60 req/min per IP)
func RateLimit() gin.HandlerFunc {
	limiter := newRateLimiter(60, time.Minute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.allow(ip) {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded, try again later",
			})
			return
		}
		c.Next()
	}
}

// AuthRateLimit creates stricter limits for auth endpoints (5 attempts per 15 minutes)
func AuthRateLimit() gin.HandlerFunc {
	limiter := newRateLimiter(5, 15*time.Minute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.allow(ip) {
			c.Header("Retry-After", "900")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many attempts, try again in 15 minutes",
			})
			return
		}
		c.Next()
	}
}

// PaymentRateLimit for payment submissions (20 payments per hour)
func PaymentRateLimit() gin.HandlerFunc {
	limiter := newRateLimiter(20, time.Hour)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.allow(ip) {
			c.Header("Retry-After", "3600")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "payment rate limit exceeded, try again later",
			})
			return
		}
		c.Next()
	}
}
