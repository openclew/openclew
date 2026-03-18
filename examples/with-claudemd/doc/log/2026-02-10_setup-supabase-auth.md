<!-- EXAMPLE: Fictitious log to demonstrate openclew doc format. Not real. -->
openclew@0.2.0 · date: 2026-02-10 · type: Feature · status: Done · category: Auth · keywords: [supabase, auth, pkce, middleware]

<!-- L1_START -->
**subject:** Supabase Auth setup with PKCE flow

**doc_brief:** [EXAMPLE] Configured Supabase Auth with PKCE flow. Middleware refreshes sessions automatically. Protected routes redirect to /login. Social auth (Google, GitHub) ready but not enabled yet.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective

Set up authentication so dashboard pages are protected and users can sign in.

## Solution

- **Auth provider**: Supabase Auth with PKCE flow (recommended for SSR)
- **Session refresh**: Next.js middleware calls `supabase.auth.getUser()` on every request
- **Protected routes**: `(dashboard)/*` routes redirect to `/login` if no session
- **Client factories**: `createServerClient` for Server Components, `createBrowserClient` for Client Components

## Watch out

- Must use `@supabase/ssr` package, not `@supabase/auth-helpers-nextjs` (deprecated)
- Middleware must be in `middleware.ts` at project root, not inside `app/`
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Files created

- `middleware.ts` — session refresh on every request
- `lib/supabase/server.ts` — `createServerClient` factory
- `lib/supabase/client.ts` — `createBrowserClient` factory
- `app/(auth)/login/page.tsx` — login form
- `app/(auth)/auth/callback/route.ts` — OAuth callback handler
<!-- L3_END -->
