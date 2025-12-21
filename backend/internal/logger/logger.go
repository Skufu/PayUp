package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"
)

// Level represents the log level.
type Level int

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
)

func (l Level) String() string {
	switch l {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// Fields holds structured log fields.
type Fields map[string]interface{}

// Logger is a structured logger with level support.
type Logger struct {
	mu       sync.Mutex
	out      io.Writer
	level    Level
	jsonMode bool
	fields   Fields
}

// Global default logger.
var defaultLogger = New(os.Stdout, LevelInfo, false)

// New creates a new Logger.
func New(out io.Writer, level Level, jsonMode bool) *Logger {
	return &Logger{
		out:      out,
		level:    level,
		jsonMode: jsonMode,
		fields:   make(Fields),
	}
}

// SetLevel sets the minimum log level.
func SetLevel(level Level) {
	defaultLogger.mu.Lock()
	defer defaultLogger.mu.Unlock()
	defaultLogger.level = level
}

// SetJSONMode enables/disables JSON output.
func SetJSONMode(enabled bool) {
	defaultLogger.mu.Lock()
	defer defaultLogger.mu.Unlock()
	defaultLogger.jsonMode = enabled
}

// Init initializes the default logger based on environment.
func Init() {
	mode := os.Getenv("GIN_MODE")
	logLevel := os.Getenv("LOG_LEVEL")

	// Set JSON mode for production
	if mode == "release" {
		SetJSONMode(true)
	}

	// Set log level from environment
	switch strings.ToUpper(logLevel) {
	case "DEBUG":
		SetLevel(LevelDebug)
	case "INFO":
		SetLevel(LevelInfo)
	case "WARN":
		SetLevel(LevelWarn)
	case "ERROR":
		SetLevel(LevelError)
	default:
		if mode == "release" {
			SetLevel(LevelInfo)
		} else {
			SetLevel(LevelDebug)
		}
	}
}

// With returns a new logger with additional fields.
func With(fields Fields) *Logger {
	defaultLogger.mu.Lock()
	defer defaultLogger.mu.Unlock()

	newFields := make(Fields)
	for k, v := range defaultLogger.fields {
		newFields[k] = v
	}
	for k, v := range fields {
		newFields[k] = v
	}

	return &Logger{
		out:      defaultLogger.out,
		level:    defaultLogger.level,
		jsonMode: defaultLogger.jsonMode,
		fields:   newFields,
	}
}

// log is the internal logging method.
func (l *Logger) log(level Level, msg string, fields Fields) {
	if level < l.level {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	// Merge instance fields with call-specific fields
	allFields := make(Fields)
	for k, v := range l.fields {
		allFields[k] = v
	}
	for k, v := range fields {
		allFields[k] = v
	}

	now := time.Now().UTC()

	if l.jsonMode {
		l.logJSON(level, msg, allFields, now)
	} else {
		l.logText(level, msg, allFields, now)
	}
}

func (l *Logger) logJSON(level Level, msg string, fields Fields, t time.Time) {
	entry := map[string]interface{}{
		"timestamp": t.Format(time.RFC3339Nano),
		"level":     level.String(),
		"message":   msg,
	}

	for k, v := range fields {
		entry[k] = v
	}

	data, _ := json.Marshal(entry)
	fmt.Fprintln(l.out, string(data))
}

func (l *Logger) logText(level Level, msg string, fields Fields, t time.Time) {
	// Format: [2024-01-02 15:04:05] LEVEL message field=value field2=value2
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("[%s] %s %s",
		t.Format("2006-01-02 15:04:05"),
		level.String(),
		msg,
	))

	for k, v := range fields {
		sb.WriteString(fmt.Sprintf(" %s=%v", k, v))
	}

	fmt.Fprintln(l.out, sb.String())
}

// Debug logs a debug message.
func Debug(msg string, fields ...Fields) {
	f := Fields{}
	if len(fields) > 0 {
		f = fields[0]
	}
	defaultLogger.log(LevelDebug, msg, f)
}

// Info logs an info message.
func Info(msg string, fields ...Fields) {
	f := Fields{}
	if len(fields) > 0 {
		f = fields[0]
	}
	defaultLogger.log(LevelInfo, msg, f)
}

// Warn logs a warning message.
func Warn(msg string, fields ...Fields) {
	f := Fields{}
	if len(fields) > 0 {
		f = fields[0]
	}
	defaultLogger.log(LevelWarn, msg, f)
}

// Error logs an error message.
func Error(msg string, fields ...Fields) {
	f := Fields{}
	if len(fields) > 0 {
		f = fields[0]
	}
	defaultLogger.log(LevelError, msg, f)
}

// ErrorWithStack logs an error with stack trace.
func ErrorWithStack(msg string, err error, fields ...Fields) {
	f := Fields{}
	if len(fields) > 0 {
		f = fields[0]
	}
	if err != nil {
		f["error"] = err.Error()
	}

	// Get caller info
	_, file, line, ok := runtime.Caller(1)
	if ok {
		f["file"] = file
		f["line"] = line
	}

	defaultLogger.log(LevelError, msg, f)
}

// AuthFailure logs a failed authentication attempt.
func AuthFailure(reason string, ip string, email string) {
	Warn("authentication failure", Fields{
		"reason": reason,
		"ip":     ip,
		"email":  email,
	})
}

// UploadError logs an upload error.
func UploadError(msg string, err error, userID string) {
	Error("upload error", Fields{
		"message": msg,
		"error":   err.Error(),
		"user_id": userID,
	})
}

// DBError logs a database error.
func DBError(operation string, err error, fields ...Fields) {
	f := Fields{
		"operation": operation,
		"error":     err.Error(),
	}
	if len(fields) > 0 {
		for k, v := range fields[0] {
			f[k] = v
		}
	}
	Error("database error", f)
}

// Panic logs a panic and returns a recovery middleware-friendly message.
func Panic(recovered interface{}, stack []byte) {
	Error("panic recovered", Fields{
		"panic": fmt.Sprintf("%v", recovered),
		"stack": string(stack),
	})
}

// Request logs an HTTP request.
func Request(method, path string, status int, latency time.Duration, ip string, fields ...Fields) {
	f := Fields{
		"method":     method,
		"path":       path,
		"status":     status,
		"latency_ms": latency.Milliseconds(),
		"ip":         ip,
	}
	if len(fields) > 0 {
		for k, v := range fields[0] {
			f[k] = v
		}
	}

	if status >= 500 {
		Error("request completed with server error", f)
	} else if status >= 400 {
		Warn("request completed with client error", f)
	} else {
		Debug("request completed", f)
	}
}
