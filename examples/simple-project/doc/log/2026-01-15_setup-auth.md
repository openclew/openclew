<!-- EXAMPLE: Fictitious log to demonstrate openclew doc format. Not real. -->
openclew@0.2.0 · date: 2026-01-15 · type: Feature · status: Done · category: Auth · keywords: [jwt, auth, tokens, cookies]

<!-- L1_START -->
**subject:** JWT authentication setup

**doc_brief:** [EXAMPLE] Implemented JWT auth with access/refresh token flow. Access tokens 15min, refresh tokens 7 days in httpOnly cookies. Middleware protects all /api routes.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective

Add authentication to the API so we can protect routes and identify users.

## Solution

- **Access token**: JWT, 15 min expiry, sent in Authorization header
- **Refresh token**: opaque token, 7 days, stored in httpOnly cookie
- **Middleware**: `requireAuth` middleware on all `/api/*` routes
- **Endpoints**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

## Watch out

- Refresh tokens are stored in DB (not stateless) — needed for logout/revocation
- CORS must allow credentials for the cookie to work cross-origin
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Token flow

1. User POSTs credentials to `/auth/login`
2. Server validates, returns access token in body + refresh token in cookie
3. Client sends access token in `Authorization: Bearer <token>` header
4. When access token expires, client POSTs to `/auth/refresh`
5. Server validates refresh cookie, returns new access token

## Files changed

- `src/routes/auth.js` — login, refresh, logout endpoints
- `src/middleware/requireAuth.js` — JWT verification middleware
- `src/services/authService.js` — token generation, validation
- `src/repositories/tokenRepository.js` — refresh token CRUD
- `db/migrations/003_create_refresh_tokens.sql`
<!-- L3_END -->
