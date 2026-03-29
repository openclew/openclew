# openclew document format

> SSOT — this file defines the canonical format for all openclew documents.
> Templates (`refdoc.md`, `log.md`), embedded templates (`lib/templates.js`), and parsers (`lib/index-gen.js`, `lib/search.js`) must conform to this spec.

---

## File structure

Every openclew document is a single Markdown file with 4 sections:

```
┌─────────────────────────────────────────────────┐
│  Line 1 — Metadata line                         │
│  Condensed key-value pairs for indexing          │
├─────────────────────────────────────────────────┤
│  L1 — Subject + Brief                           │
│  ~40 tokens. "Should I read this?"              │
├─────────────────────────────────────────────────┤
│  L2 — Summary                                   │
│  Essential context. Enough for most decisions.   │
├─────────────────────────────────────────────────┤
│  L3 — Details                                   │
│  Full technical content. Deep-dive only.         │
└─────────────────────────────────────────────────┘
```

---

## Line 1 — Metadata

A single line of condensed key-value pairs separated by ` · `. Always the first line of the file, no blank line before it.

### Refdoc format

```
openclew@VERSION · created: YYYY-MM-DD · updated: YYYY-MM-DD · type: TYPE · status: STATUS · category: CATEGORY · keywords: [tag1, tag2]
```

### Log format

```
openclew@VERSION · date: YYYY-MM-DD · type: TYPE · status: STATUS · category: CATEGORY · keywords: [tag1, tag2]
```

### Fields

| Field | Refdoc | Log | Description |
|-------|:------:|:---:|-------------|
| `openclew@VERSION` | ✅ | ✅ | Package version that created the doc |
| `created` | ✅ | — | Creation date |
| `updated` | ✅ | — | Last update date |
| `date` | — | ✅ | Session date |
| `type` | ✅ | ✅ | Document type (see below) |
| `status` | ✅ | ✅ | Document status (see below) |
| `category` | ✅ | ✅ | Main domain (free text) |
| `keywords` | ✅ | ✅ | Tags for search `[tag1, tag2]` |

### Types

| Type | Usage |
|------|-------|
| `Reference` | Durable knowledge (architecture, conventions, decisions) |
| `Architecture` | Structural design document |
| `Guide` | How-to, onboarding, process explanation |
| `Analysis` | Investigation, comparison, study |
| `Bug` | Bug investigation and fix |
| `Feature` | New functionality |
| `Refactor` | Code restructuring |
| `Doc` | Documentation-only change |
| `Deploy` | Deployment or release |

### Statuses

| Status | Refdoc | Log | Description |
|--------|:------:|:---:|-------------|
| `Active` | ✅ | — | Living document, actively maintained |
| `Stable` | ✅ | — | Mature, rarely updated |
| `Archived` | ✅ | — | No longer relevant, kept for history |
| `In progress` | — | ✅ | Work ongoing |
| `Done` | — | ✅ | Work completed |
| `Abandoned` | — | ✅ | Work stopped, approach not viable |

---

## L1 — Subject + Brief

Between `<!-- L1_START -->` and `<!-- L1_END -->` markers. Two fields only:

```markdown
<!-- L1_START -->
**subject:** Short title (< 60 chars)

**doc_brief:** 1-2 sentences describing what was done and why, not what the document contains. Must be enough to decide if you need to read further.
<!-- L1_END -->
```

### Rules

- **subject** is the document's title. Keep it short and scannable.
- **doc_brief** answers: "Should I read this?" Describe **what was done and why**, not what the document contains. Quick test: if it starts with "this document describes/presents/contains", it's meta — rewrite with concrete content.
  - Bad (meta): "Configuration and usage of the authentication system for the web application."
  - Bad (process without conclusion): "Investigated memory leak in worker pool. Profiled with pprof, tested several fixes."
  - Good: "Worker pool leaked memory via unclosed response bodies in retry path. Fixed with deferred close. Steady at 120MB under load."
- Both fields use `**bold_key:**` syntax (not YAML `key: value`).
- No other fields in L1. All metadata lives on line 1.

---

## L2 — Summary

Between `<!-- L2_START -->` and `<!-- L2_END -->` markers. Starts with `# L2 - Summary`.

```markdown
<!-- L2_START -->
# L2 - Summary

## Objective
<!-- Why this document exists / why this work was done -->

## Key points
<!-- 3-5 essential takeaways -->

## Solution
<!-- Recommended approach or what was implemented -->

## Watch out
<!-- Pitfalls, edge cases, limitations -->
<!-- L2_END -->
```

### Rules

- Must fit on one screen (~40 lines of ~80 chars).
- No emojis in headers.
- Sections are suggested, not mandatory — adapt to the content.
- Refdocs typically use: Objective, Key points, Solution, Watch out.
- Logs typically use: Objective, Problem, Solution, Watch out.

---

## L3 — Details

Between `<!-- L3_START -->` and `<!-- L3_END -->` markers. Starts with `# L3 - Details`.

```markdown
<!-- L3_START -->
# L3 - Details

<!-- Full technical content: code examples, diagrams, deep dives... -->

---

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial creation |
<!-- L3_END -->
```

### Rules

- Exhaustive — include everything that might be needed later.
- Code examples, before/after, commands, links.
- Changelog table at the end (refdocs only — logs are immutable).

---

## Naming conventions

| Type | Location | Naming |
|------|----------|--------|
| Refdoc | `doc/_SUBJECT.md` | UPPER_SNAKE_CASE, prefixed `_` |
| Log | `doc/log/YYYY-MM-DD_subject.md` | lowercase-with-hyphens, dated |
| Index | `doc/_INDEX.md` | Optional human-friendly cache, generated by `openclew index` |

---

## Parser compatibility

The `lib/index-gen.js` parser (via `lib/search.js`) extracts:
1. **Line 1 metadata**: splits on ` · `, parses `key: value` pairs
2. **L1 fields**: regex for `**subject:**` and `**doc_brief:**` between L1 markers

**Legacy fallback**: if no `**subject:**` is found in L1, the parser falls back to plain `key: value` lines (for docs created before the `**bold:**` convention).

**Line 1 prefix**: must start with `openclew@`. Files starting with other prefixes (e.g. `R.AlphA.Doc@`) are not parsed by the openclew toolchain but remain valid Markdown.

---

## Complete examples

### Refdoc example

```markdown
openclew@0.2.1 · created: 2026-03-07 · updated: 2026-03-20 · type: Reference · status: Active · category: Auth · keywords: [JWT, sessions, Redis]

<!-- L1_START -->
**subject:** Authentication architecture

**doc_brief:** JWT-based auth with refresh tokens. Sessions stored in Redis with 15-min expiry. Google OAuth as sole provider. Token refresh handled client-side.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
Document the auth architecture so agents and new devs can work on auth-related code without re-investigating.

## Key points
- JWT access tokens (15 min) + refresh tokens (7 days)
- Redis for session storage (not Postgres — latency matters)
- Google OAuth only (no email/password)
- Refresh handled client-side via interceptor

## Watch out
- Refresh endpoint has no rate limiting yet — track issue #42
- Test tokens in .env.test, never commit real secrets
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Token flow
Client → /auth/google → JWT + refresh token
Client → /auth/refresh → new JWT (if refresh valid)

## Key files
- src/routes/auth.ts — OAuth + refresh endpoints
- src/middleware/auth.ts — JWT verification
- src/services/session.ts — Redis session management

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-20 | Added rate limiting note |
| 2026-03-07 | Initial creation |
<!-- L3_END -->
```

### Log example

```markdown
openclew@0.2.1 · date: 2026-03-15 · type: Bug · status: Done · category: Auth · keywords: [token, refresh, race condition]

<!-- L1_START -->
**subject:** Fix token refresh race condition

**doc_brief:** Two concurrent requests could trigger double refresh, invalidating both tokens. Fixed with a mutex in the interceptor. No more 401 cascades.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
Fix intermittent 401 errors when multiple API calls happen during token refresh.

## Problem
Two concurrent requests both detect an expired token and both call /auth/refresh. The second call invalidates the first's new token, causing a 401 cascade.

## Solution
Added a refresh mutex in the HTTP interceptor. First request triggers refresh, others wait for the result. Single refresh call per expiry cycle.
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Root cause
The interceptor checked `isTokenExpired()` synchronously but `refreshToken()` was async. Between the check and the refresh response, other requests would also see the expired token and trigger their own refresh.

## Fix (src/lib/http-client.ts)
```ts
let refreshPromise = null;

async function ensureValidToken() {
  if (!isTokenExpired()) return;
  if (!refreshPromise) {
    refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
  }
  await refreshPromise;
}
```

## Testing
- Added test: 10 concurrent requests during token expiry → exactly 1 refresh call
- Manual test: rapid navigation between pages during expiry window
<!-- L3_END -->
```
