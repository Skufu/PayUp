package sqlcutil

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func UUID(u uuid.UUID) pgtype.UUID {
	var b [16]byte
	copy(b[:], u[:])
	return pgtype.UUID{Bytes: b, Valid: true}
}

func UUIDString(s string) (pgtype.UUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return UUID(u), nil
}

func UUIDToString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	u := uuid.UUID(id.Bytes)
	return u.String()
}

func UUIDToUUID(id pgtype.UUID) (uuid.UUID, bool) {
	if !id.Valid {
		return uuid.Nil, false
	}
	return uuid.UUID(id.Bytes), true
}

func Time(t pgtype.Timestamptz) (time.Time, bool) {
	if !t.Valid {
		return time.Time{}, false
	}
	return t.Time, true
}

func Timestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

func NullTimestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return Timestamptz(*t)
}
