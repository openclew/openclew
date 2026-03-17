<!-- EXAMPLE: Fictitious CLAUDE.md to demonstrate openclew integration. Not real. -->
# My Project

## Context

SaaS dashboard built with Next.js 14 + Supabase. Deployed on Vercel.

## Commands

- `npm run dev` — start dev server
- `npm run test` — run tests
- `npm run migrate` — run DB migrations

## Project knowledge

Documentation lives in `doc/`. Each doc has 3 levels (L1/L2/L3).
- Read L1 first to decide if you need more
- Living docs: `doc/_*.md` (living knowledge, updated over time)
- Logs: `doc/log/YYYY-MM-DD_*.md` (frozen facts, never modified)
- Index: `doc/_INDEX.md` (auto-generated, start here)

## Known issues

- Supabase RLS policies must be updated manually after schema changes
- Edge functions have a 10s timeout — long-running tasks use background jobs
