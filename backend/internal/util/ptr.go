package util

// Deref safely dereferences a string pointer, returning empty string if nil.
func Deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Ptr returns a pointer to the given value.
func Ptr[T any](v T) *T {
	return &v
}
