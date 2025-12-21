package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type Issuer struct {
	Secret          []byte
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

const ResetTokenTTL = 15 * time.Minute

func (i Issuer) Issue(userID string) (TokenPair, error) {
	if len(i.Secret) == 0 {
		return TokenPair{}, errors.New("JWT secret is required")
	}

	now := time.Now()

	access := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"typ": "access",
		"iat": now.Unix(),
		"exp": now.Add(i.AccessTokenTTL).Unix(),
	})
	accessStr, err := access.SignedString(i.Secret)
	if err != nil {
		return TokenPair{}, err
	}

	refresh := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"typ": "refresh",
		"iat": now.Unix(),
		"exp": now.Add(i.RefreshTokenTTL).Unix(),
	})
	refreshStr, err := refresh.SignedString(i.Secret)
	if err != nil {
		return TokenPair{}, err
	}

	return TokenPair{AccessToken: accessStr, RefreshToken: refreshStr}, nil
}

func (i Issuer) Parse(tokenStr string, wantType string) (userID string, err error) {
	if len(i.Secret) == 0 {
		return "", errors.New("JWT secret is required")
	}

	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return i.Secret, nil
	})
	if err != nil {
		return "", err
	}
	if !tok.Valid {
		return "", errors.New("invalid token")
	}

	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid token claims")
	}
	if wantType != "" {
		if typ, _ := claims["typ"].(string); typ != wantType {
			return "", errors.New("wrong token type")
		}
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", errors.New("missing sub claim")
	}

	return sub, nil
}

// IssueResetToken creates a password reset token with 15-minute expiry.
func (i Issuer) IssueResetToken(userID string) (string, error) {
	if len(i.Secret) == 0 {
		return "", errors.New("JWT secret is required")
	}

	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"typ": "reset",
		"iat": now.Unix(),
		"exp": now.Add(ResetTokenTTL).Unix(),
	})

	return token.SignedString(i.Secret)
}
