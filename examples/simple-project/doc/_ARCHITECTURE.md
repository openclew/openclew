<!-- EXAMPLE: Fictitious project to demonstrate openclew doc format. Not real. -->
<!-- L1_START -->
# L1 - Metadata
type: Architecture
subject: Simple Project architecture overview
created: 2026-01-10
updated: 2026-03-01
short_story: "[EXAMPLE] Express.js API with PostgreSQL. Three-layer architecture (routes, services, repositories). Auth via JWT. Deployed on Railway."
status: Active
category: Architecture
keywords: [express, postgresql, jwt, railway]
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective

Document the project's technical architecture for onboarding and AI agent context.

## Key points

- **Stack**: Node.js + Express, PostgreSQL, Redis (cache)
- **Architecture**: routes → services → repositories (3 layers, strict separation)
- **Auth**: JWT access tokens (15 min) + refresh tokens (7 days) in httpOnly cookies
- **Deploy**: Railway, auto-deploy on push to `main`
- **Tests**: Jest + Supertest, coverage > 80%

## Watch out

- Never import a repository directly from a route — always go through a service
- Redis is optional in dev (falls back to in-memory cache)
- Migration files are in `db/migrations/`, run with `npm run migrate`
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Directory structure

```
src/
├── routes/          # HTTP layer — validation, response formatting
├── services/        # Business logic — orchestration, rules
├── repositories/    # Data access — SQL queries, ORM calls
├── middleware/       # Auth, error handling, rate limiting
└── utils/           # Shared helpers (logger, config)
```

## Database

- PostgreSQL 15
- Migrations managed with `node-pg-migrate`
- Connection pooling via `pg-pool` (max 20 connections)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | yes | PostgreSQL connection string |
| JWT_SECRET | yes | Secret for signing tokens |
| REDIS_URL | no | Redis connection (falls back to memory) |
| PORT | no | Server port (default: 3000) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-10 | Initial creation |
| 2026-02-15 | Added Redis cache layer |
| 2026-03-01 | Updated JWT token durations |
<!-- L3_END -->
