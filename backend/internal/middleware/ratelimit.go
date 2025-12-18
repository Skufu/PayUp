package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// formatInt converts an int to string for headers
func formatInt(n int) string {
	return strconv.Itoa(n)
}

// rateLimiter implements a simple in-memory rate limiter using token bucket algorithm.
type rateLimiter struct {
	mu         sync.Mutex
	visitors   map[string]*visitor
	rate       int           // requests allowed per period
	period     time.Duration // time period
	maxEntries int           // maximum number of entries to prevent memory leak
}

type visitor struct {
	tokens    int
	lastReset time.Time
	lastSeen  time.Time // Track last access for LRU eviction
}

func newRateLimiter(rate int, period time.Duration) *rateLimiter {
	rl := &rateLimiter{
		visitors:   make(map[string]*visitor),
		rate:       rate,
		period:     period,
		maxEntries: 10000, // Limit to prevent unbounded growth
	}
	// Cleanup old entries every 30 seconds
	go rl.cleanup()
	return rl
}

func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		// Remove entries older than 2 periods
		cutoff := time.Now().Add(-rl.period * 2)
		for ip, v := range rl.visitors {
			if v.lastSeen.Before(cutoff) {
				delete(rl.visitors, ip)
			}
		}
		// If still over limit, use LRU eviction
		if len(rl.visitors) > rl.maxEntries {
			rl.evictLRU()
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) evictLRU() {
	// Find oldest entry
	var oldestIP string
	var oldestTime time.Time
	first := true
	for ip, v := range rl.visitors {
		if first || v.lastSeen.Before(oldestTime) {
			oldestIP = ip
			oldestTime = v.lastSeen
			first = false
		}
	}
	if oldestIP != "" {
		delete(rl.visitors, oldestIP)
	}
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	v, exists := rl.visitors[ip]
	if !exists {
		// Check if we're at capacity and need to evict
		if len(rl.visitors) >= rl.maxEntries {
			rl.evictLRU()
		}
		rl.visitors[ip] = &visitor{
			tokens:    rl.rate - 1,
			lastReset: now,
			lastSeen:  now,
		}
		return true
	}

	// Update last seen
	v.lastSeen = now

	// Reset tokens if period has passed
	if time.Since(v.lastReset) > rl.period {
		v.tokens = rl.rate - 1
		v.lastReset = now
		return true
	}

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// getStatus returns the current rate limit status for an IP
func (rl *rateLimiter) getStatus(ip string) (remaining int, resetTime time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	v, exists := rl.visitors[ip]
	if !exists {
		return rl.rate, now.Add(rl.period)
	}

	// If period has passed, return full rate
	if time.Since(v.lastReset) > rl.period {
		return rl.rate, now.Add(rl.period)
	}

	return v.tokens, v.lastReset.Add(rl.period)
}

// RateLimit creates a general rate limiter (60 req/min per IP)
func RateLimit() gin.HandlerFunc {
	limiter := newRateLimiter(60, time.Minute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		remaining, resetTime := limiter.getStatus(ip)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", "60")
		c.Header("X-RateLimit-Remaining", formatInt(remaining))
		c.Header("X-RateLimit-Reset", formatInt(int(resetTime.Unix())))

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
// Used for login/register/oauth endpoints due to higher security risk
func AuthRateLimit() gin.HandlerFunc {
	limiter := newRateLimiter(5, 15*time.Minute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		remaining, resetTime := limiter.getStatus(ip)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", "5")
		c.Header("X-RateLimit-Remaining", formatInt(remaining))
		c.Header("X-RateLimit-Reset", formatInt(int(resetTime.Unix())))

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
		remaining, resetTime := limiter.getStatus(ip)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", "20")
		c.Header("X-RateLimit-Remaining", formatInt(remaining))
		c.Header("X-RateLimit-Reset", formatInt(int(resetTime.Unix())))

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

// RefreshRateLimit creates more lenient limits for token refresh (30 attempts per 15 minutes)
// Higher limit than login because:
// - Refresh requires a valid refresh token (already authenticated)
// - Multiple browser tabs from the same user shouldn't cause lockouts
// - Proactive refresh on token expiration needs headroom
func RefreshRateLimit() gin.HandlerFunc {
	limiter := newRateLimiter(30, 15*time.Minute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		remaining, resetTime := limiter.getStatus(ip)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", "30")
		c.Header("X-RateLimit-Remaining", formatInt(remaining))
		c.Header("X-RateLimit-Reset", formatInt(int(resetTime.Unix())))

		if !limiter.allow(ip) {
			c.Header("Retry-After", "900")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many refresh attempts, try again in 15 minutes",
			})
			return
		}
		c.Next()
	}
}
