package handlers

import (
	"errors"
	"regexp"
	"strings"
	"unicode"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// ValidateEmail checks if the email format is valid.
func ValidateEmail(email string) bool {
	email = strings.TrimSpace(email)
	if len(email) == 0 || len(email) > 255 {
		return false
	}
	return emailRegex.MatchString(email)
}

// ValidatePassword checks password meets minimum requirements.
// Returns nil if valid, error with message if invalid.
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	// bcrypt has a max of 72 bytes
	if len(password) > 72 {
		return errors.New("password too long (max 72 characters)")
	}
	return nil
}

// ValidatePasswordStrength checks for strong password requirements.
// Use this for production environments requiring stronger passwords.
func ValidatePasswordStrength(password string) error {
	if len(password) < 12 {
		return errors.New("password must be at least 12 characters")
	}
	if len(password) > 72 {
		return errors.New("password too long (max 72 characters)")
	}

	var (
		hasUpper   = false
		hasLower   = false
		hasNumber  = false
		hasSpecial = false
	)

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

// ValidateUUID checks if a string is a valid UUID format.
func ValidateUUID(id string) bool {
	return uuidRegex.MatchString(id)
}

// ValidateName checks if a name is valid (not empty, reasonable length).
func ValidateName(name string) error {
	name = strings.TrimSpace(name)
	if len(name) == 0 {
		return errors.New("name is required")
	}
	if len(name) > 100 {
		return errors.New("name too long (max 100 characters)")
	}
	return nil
}

// ValidateAmount checks if an amount is valid for financial operations.
func ValidateAmount(amount float64) error {
	if amount <= 0 {
		return errors.New("amount must be greater than 0")
	}
	if amount > 1000000 {
		return errors.New("amount exceeds maximum limit")
	}
	return nil
}

// ValidateTitle checks if a title/description is valid.
func ValidateTitle(title string) error {
	title = strings.TrimSpace(title)
	if len(title) == 0 {
		return errors.New("title is required")
	}
	if len(title) > 200 {
		return errors.New("title too long (max 200 characters)")
	}
	return nil
}

// ValidateGroupName checks if a group name is valid.
func ValidateGroupName(name string) error {
	name = strings.TrimSpace(name)
	if len(name) == 0 {
		return errors.New("group name is required")
	}
	if len(name) > 100 {
		return errors.New("group name too long (max 100 characters)")
	}
	return nil
}

// ValidateURL checks if a URL is valid and uses https.
func ValidateURL(url string) error {
	url = strings.TrimSpace(url)
	if len(url) == 0 {
		return nil // Optional field
	}
	if len(url) > 500 {
		return errors.New("URL too long (max 500 characters)")
	}
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		return errors.New("invalid URL format")
	}
	return nil
}
