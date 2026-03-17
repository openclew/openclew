<!-- EXAMPLE: Fictitious project to demonstrate openclew doc format. Not real. -->
<!-- L1_START -->
# L1 - Metadata
type: Architecture
subject: SaaS Dashboard architecture
created: 2026-02-01
updated: 2026-03-05
short_story: "[EXAMPLE] Next.js 14 App Router + Supabase (auth, DB, storage). Server Components by default, Client Components only for interactivity. Tailwind + shadcn/ui. Deployed on Vercel with preview deploys per PR."
status: Active
category: Architecture
keywords: [nextjs, supabase, vercel, tailwind, shadcn]
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Key points

- **Frontend**: Next.js 14 App Router, Server Components by default
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Storage)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Auth**: Supabase Auth with PKCE flow, middleware-based session refresh
- **Deploy**: Vercel, auto-deploy on push, preview deploys per PR

## Watch out

- Always use `createServerClient` in Server Components, `createBrowserClient` in Client Components
- RLS policies are the security layer — never bypass them in Edge Functions
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Directory structure

```
app/
├── (auth)/         # Auth pages (login, signup) — no layout sidebar
├── (dashboard)/    # Protected pages — sidebar layout
├── api/            # API routes (webhooks, cron)
└── layout.tsx      # Root layout (providers, fonts)

components/
├── ui/             # shadcn/ui primitives
└── features/       # Domain-specific components

lib/
├── supabase/       # Client factories (server, browser, middleware)
└── utils/          # Shared helpers
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-01 | Initial creation |
| 2026-03-05 | Added edge functions section |
<!-- L3_END -->
