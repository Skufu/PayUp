# Google OAuth Setup Guide

## Current Status

Google OAuth is **implemented but not configured**. The frontend now gracefully handles missing credentials by hiding the Google button when `GOOGLE_CLIENT_ID` is a placeholder.

## To Enable Google OAuth:

### 1. Get OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create a new project (or use existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Configure OAuth consent screen (External for testing)
6. Application type: **Web application**
7. Add authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://your-production-domain.com` (prod)
8. Click **Create**
9. Copy the **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

### 2. Update Environment Variables

Edit `~/workspace/github.com/Skufu/PayUp/.env`:

```bash
# Replace this:
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# With your real client ID:
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
```

### 3. Restart Services

```bash
# Stop current frontend (Ctrl+C if running in terminal)
# Then restart:
cd ~/workspace/github.com/Skufu/PayUp/frontend
npm run dev

# Backend should pick up env changes on restart too
cd ~/workspace/github.com/Skufu/PayUp/backend
go run ./cmd/api
```

### 4. Test

1. Navigate to http://localhost:5173/auth/login
2. You should now see the "Continue with Google" button
3. Click it and sign in with a Google account
4. The app should authenticate you and redirect to `/app`

## Troubleshooting

### Error: "Missing required parameter: client_id"
- The `VITE_GOOGLE_CLIENT_ID` is still set to a placeholder
- Check that `.env` has been updated and the frontend restarted

### Error: "redirect_uri_mismatch"
- The origin you're running on isn't in the authorized JavaScript origins list
- Add `http://localhost:5173` (or your actual origin) to the Google Cloud Console

### Error: "invalid_client"
- The client ID might be wrong or the OAuth app might be deleted
- Verify the client ID in Google Cloud Console matches your `.env` file

### Google button doesn't appear
- This is expected if `VITE_GOOGLE_CLIENT_ID` is a placeholder
- We intentionally hide the button to prevent the authorization error
- Set a real client ID to see the button

## Implementation Details

### Files Modified

1. **`frontend/src/main.tsx`**
   - Conditionally wraps app with `GoogleOAuthProvider` only when valid client ID exists

2. **`frontend/src/payup/pages/auth/LoginPage.tsx`**
   - Conditionally renders `GoogleLogin` button only when valid client ID exists

### Backend Endpoint

**POST `/v1/auth/google`** — Handles Google OAuth ID token verification

```json
// Request
{
  "idToken": "google-credential-response-token"
}

// Response (same as register/login)
{
  "user": { ... },
  "token": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

The backend verifies the token with Google's API and either:
- Links to existing user if email matches
- Creates new user if first-time Google sign-in
- Returns existing user if already linked

## Security Notes

1. **Never commit real client IDs** — The `.env` file should be in `.gitignore`
2. **Use separate OAuth apps** for dev/staging/prod with different client IDs
3. **Restrict authorized origins** — Only add origins you actually use
4. **Enable OAuth consent screen** — Required for production use
5. **Consider domain verification** — For production apps, verify your domain with Google

## Quick Reference

| Task | Command/File |
|------|--------------|
| Get credentials | https://console.cloud.google.com/apis/credentials |
| Update env | `~/workspace/github.com/Skufu/PayUp/.env` |
| Restart frontend | `cd frontend && npm run dev` |
| Test endpoint | `curl -X POST http://localhost:8080/v1/auth/google -d '{"idToken":"test"}'` |

---

**Need help?** Check the troubleshooting section above or look at the implementation in:
- `backend/internal/handlers/auth.go:396` (GoogleAuth handler)
- `frontend/src/payup/pages/auth/LoginPage.tsx` (GoogleLogin component)
