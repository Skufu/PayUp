---
name: docs-verifier
description: Verifies and updates documentation files to match the actual codebase
---

# Documentation Verifier

Verifies documentation accuracy against the actual codebase and updates documentation to fix discrepancies.

## When to Use This Skill

Use this skill for documentation audit features where you need to:
1. Read a documentation file (e.g., REFERENCE.md, API.md)
2. Cross-reference with actual source code
3. Update documentation to fix discrepancies
4. Ensure file paths, API routes, and code examples are accurate

## Required Skills

None - this skill uses standard file reading and editing tools.

## Work Procedure

### 1. Read the Target Documentation File
Read the documentation file assigned to you completely. Note all:
- File paths referenced
- API endpoints documented
- Code examples shown
- Environment variables listed
- Commands provided

### 2. Gather Source of Truth Files
Read the relevant source files based on what you're verifying:

**For API documentation:**
- `backend/internal/server/server.go` - all routes
- `backend/internal/handlers/*.go` - request/response types

**For database documentation:**
- `backend/sql/schema.sql` - table definitions

**For frontend documentation:**
- `frontend/src/App.tsx` - routes
- `frontend/package.json` - dependencies
- `frontend/src/**/*.tsx` - component locations

**For backend documentation:**
- `backend/go.mod` - Go version and deps
- `backend/internal/server/server.go` - middleware order
- `backend/internal/middleware/*.go` - middleware implementation

**For environment variables:**
- `env.example` - primary reference
- `render.env.example` - production variables
- `backend/internal/config/config.go` - what's actually read

### 3. Identify Discrepancies
Create a list of issues found:
- **Critical**: Wrong commands, incorrect env vars, non-existent files referenced
- **Warning**: Missing endpoints, outdated field names, minor path issues
- **Info**: Missing but non-critical documentation

### 4. Update Documentation
Edit the documentation file to fix discrepancies:
- Fix file paths to match actual locations
- Add missing API endpoints
- Correct request/response field names
- Update environment variable lists
- Fix command examples

### 5. Verification Checklist
Before completing, verify:
- [ ] All file paths in documentation exist
- [ ] All API endpoints match server.go
- [ ] All env vars match env.example
- [ ] All commands use correct syntax
- [ ] Technology versions match package.json/go.mod

### 6. Document Known Issues
If there are code bugs (not doc issues), document them in the handoff:
- Note what the documentation claims
- Note what the code actually does
- Mark as "requires code change" not "documentation fix"

## Example Handoff

```json
{
  "salientSummary": "Updated API.md to add missing OCR endpoint, corrected Google Auth field name from 'credential' to 'idToken', and fixed rate limit values to match implementation.",
  "whatWasImplemented": "Documentation updates to API.md: 1) Added POST /v1/ocr endpoint documentation, 2) Fixed Google Auth request field from 'credential' to 'idToken', 3) Corrected Profile rate limit from 30/min to 100/hour, 4) Added 'avatar' field to PATCH /v1/auth/profile, 5) Fixed reset-password field from 'password' to 'newPassword'.",
  "whatWasLeftUndone": "Google Auth field mismatch requires backend code change - handler expects 'idToken' but may need to support 'credential' for standard Google OAuth. Documented the actual implementation.",
  "verification": {
    "commandsRun": [
      {
        "command": "grep -n 'idToken' backend/internal/handlers/auth.go",
        "exitCode": 0,
        "observation": "Confirmed handler expects 'idToken' field in GoogleAuthRequest struct"
      },
      {
        "command": "grep -n 'POST.*ocr' backend/internal/server/server.go",
        "exitCode": 0,
        "observation": "Confirmed OCR endpoint exists at POST /v1/ocr"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": [
    {
      "severity": "warning",
      "description": "Google OAuth handler expects 'idToken' field but standard Google OAuth uses 'credential'. May need backend update for compatibility.",
      "suggestedFix": "Consider updating handler to accept both 'idToken' and 'credential' fields for compatibility"
    }
  ]
}
```

## When to Return to Orchestrator

Return to orchestrator if:
- The documentation discrepancy reveals a significant code bug that should be fixed first
- You find contradictory requirements across multiple documentation files
- The fix requires creating new documentation structure (moving files between directories)
- You discover missing features that should be implemented before documenting
