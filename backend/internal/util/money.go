package util

import (
	"fmt"
	"math"
	"strconv"
)

// MoneyToCents converts a float amount to cents (integer) to avoid floating point issues.
func MoneyToCents(v float64) int64 {
	return int64(math.Round(v * 100))
}

// CentsToMoneyString formats cents as a decimal string with 2 decimal places.
func CentsToMoneyString(cents int64) string {
	return fmt.Sprintf("%.2f", float64(cents)/100)
}

// CentsToFloat converts cents to a float64 for JSON responses.
func CentsToFloat(cents int64) float64 {
	return float64(cents) / 100
}

// MustMoneyToFloat parses a numeric string (from DB) to float64.
// Returns 0 on error.
func MustMoneyToFloat(s string) float64 {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return f
}
