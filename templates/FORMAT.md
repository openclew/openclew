# openclew document format

> SSOT -- this file defines the canonical format for all openclew documents.
> Templates (`ref.md`, `log.md`), embedded templates (`lib/templates.js`), and parsers (`lib/index-gen.js`, `lib/search.js`) must conform to this spec.

---

## File structure

Every openclew document is a single Markdown file with 4 sections:

```
+--------------------------------------------------+
|  Line 1 -- Metadata line                         |
|  Condensed key-value pairs for indexing           |
+--------------------------------------------------+
|  L1 -- Subject + Brief                           |
|  List items between line 1 and first ---          |
|  ~40 tokens. "Should I read this?"               |
+--------------------------------------------------+
|  L2 -- Summary  (# Summary)                      |
|  Essential context. Enough for most decisions.    |
+--------------------------------------------------+
|  L3 -- Details  (# Details)                      |
|  Full technical content. Deep-dive only.          |
+--------------------------------------------------+
```

---

## Line 1 -- Metadata

A single line of condensed key-value pairs separated by ` · `. Always the first line of the file, no blank line before it.

### Ref format

```
clw_ref@VERSION · created: YYYY-MM-DD · updated: YYYY-MM-DD · type: TYPE · status: STATUS · category: CATEGORY · keywords: [tag1, tag2]
```

### Log format

```
clw_log@VERSION · date: YYYY-MM-DD · type: TYPE · status: STATUS · category: CATEGORY · keywords: [tag1, tag2]
```

### Prefix

The line 1 prefix encodes the document type for fast grep-based discovery:

| Prefix | Usage | Grep |
|--------|-------|------|
| `clw_ref@` | Ref (living knowledge) | `grep "clw_ref@"` |
| `clw_log@` | Log (dated, immutable) | `grep "clw_log@"` |

This replaces the previous `openclew@VERSION` prefix. The prefix encodes the document category (ref vs log), while the `type:` field encodes the semantic type (Reference, Bug, Feature...). The prefix is greppable in one shot regardless of where the file is stored.

**Legacy compatibility**: files starting with `openclew@` are still parsed correctly. Use `openclew migrate` to convert.

### Fields

| Field | Ref | Log | Description |
|-------|:------:|:---:|-------------|
| `clw_ref@VERSION` / `clw_log@VERSION` | Y | Y | Package version that created the doc + document type |
| `created` | Y | -- | Creation date |
| `updated` | Y | -- | Last update date |
| `date` | -- | Y | Session date |
| `type` | Y | Y | Document type (see below) |
| `status` | Y | Y | Document status (see below) |
| `category` | Y | Y | Main domain (free text) |
| `keywords` | Y | Y | Tags for search `[tag1, tag2]` |

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

| Status | Ref | Log | Description |
|--------|:------:|:---:|-------------|
| `Active` | Y | -- | Living document, actively maintained |
| `Stable` | Y | -- | Mature, rarely updated |
| `Archived` | Y | -- | No longer relevant, kept for history |
| `In progress` | -- | Y | Work ongoing |
| `Done` | -- | Y | Work completed |
| `Abandoned` | -- | Y | Work stopped, approach not viable |

---

## L1 -- Subject + Brief

Two list items placed directly after line 1 (with a blank line separator), before the first `---` horizontal rule.

```markdown
clw_ref@0.7.0 · created: 2026-03-07 · ...

- **subject:** Short title (< 60 chars)
- **doc_brief:** 1-2 sentences describing what was done and why, not what the document contains. Must be enough to decide if you need to read further.

---
```

### Rules

- **subject** is the document's title. Keep it short and scannable.
- **doc_brief** answers: "Should I read this?" Describe **what was done and why**, not what the document contains. Quick test: if it starts with "this document describes/presents/contains", it's meta -- rewrite with concrete content.
  - Bad (meta): "Configuration and usage of the authentication system for the web application."
  - Bad (process without conclusion): "Investigated memory leak in worker pool. Profiled with pprof, tested several fixes."
  - Good: "Worker pool leaked memory via unclosed response bodies in retry path. Fixed with deferred close. Steady at 120MB under load."
- Both fields use `**bold_key:**` syntax (not YAML `key: value`), prefixed with `- ` as list items.
- No other fields in L1. All metadata lives on line 1.

### Legacy formats (supported by parser)

The parser supports two older formats for backward compatibility:

**Comment-based markers** (oldest):
```markdown
<!-- L1_START -->
**subject:** Short title
**doc_brief:** Brief description.
<!-- L1_END -->
```

**Div wrappers** (previous default):
```markdown
<div class="oc-l1">

- **subject:** Short title
- **doc_brief:** Brief description.

</div>
```

Both are read correctly by the parser. Use `openclew migrate` to convert legacy docs to the current pure Markdown format.

---

## L2 -- Summary

Starts with `# Summary`, placed after the first `---` separator.

```markdown
---

# Summary

## Objective
<!-- Why this document exists / why this work was done -->

## Key points
<!-- 3-5 essential takeaways -->

## Solution
<!-- Recommended approach or what was implemented -->

## Watch out
<!-- Pitfalls, edge cases, limitations -->

---
```

### Rules

- Must fit on one screen (~40 lines of ~80 chars).
- No emojis in headers.
- Sections are suggested, not mandatory -- adapt to the content.
- Refs typically use: Objective, Key points, Solution, Watch out.
- Logs typically use: Objective, Problem, Solution, Watch out.

---

## L3 -- Details

Starts with `# Details`, placed after the second `---` separator.

```markdown
---

# Details

<!-- Full technical content: code examples, diagrams, deep dives... -->

---

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial creation |
```

### Rules

- Exhaustive -- include everything that might be needed later.
- Code examples, before/after, commands, links.
- Changelog table at the end (refs only -- logs are immutable).

---

## Naming conventions

| Type | Location | Naming |
|------|----------|--------|
| Ref | `doc/ref/SUBJECT.md` | UPPER_SNAKE_CASE, in `doc/ref/` |
| Log | `doc/log/YYYY-MM-DD_subject.md` | lowercase-with-hyphens, dated |
| Index | `doc/_INDEX.md` | Optional human-friendly cache, generated by `openclew index` |

### Ref subfolders

When ≥3 refs cover the same domain, group them in a subfolder: `doc/ref/<theme>/`. Each subfolder contains a `_peek.md` index file for discovery.

### Legacy naming

Previous convention used `doc/_SUBJECT.md` (prefixed `_` at doc root). Use `openclew migrate --move` to relocate files and update all references.

---

## CSS styling

`openclew init` installs `.vscode/openclew-preview.css` and configures `markdown.styles` in `.vscode/settings.json`. The CSS targets the div classes `.oc-l1`, `.oc-l2`, `.oc-l3` for visual distinction in VS Code Markdown preview.

New docs use pure Markdown (no div wrappers). The CSS still works for existing div-formatted docs but is not required for the current format.

---

## Parser compatibility

The `lib/index-gen.js` parser (via `lib/search.js`) extracts:
1. **Line 1 metadata**: splits on ` · `, parses `key: value` pairs
2. **L1 fields**: regex for `**subject:**` and `**doc_brief:**` using multiple strategies:
   - **Positional** (current): list items between line 1 and the first `---` separator
   - **Div wrappers** (legacy): inside `<div class="oc-l1">` ... `</div>`
   - **Comment markers** (oldest): between `<!-- L1_START -->` and `<!-- L1_END -->`

**Legacy fallback**: if no `**subject:**` is found in L1, the parser falls back to plain `key: value` lines (for docs created before the `**bold:**` convention).

**Line 1 prefix**: must start with `clw_ref@` (refs) or `clw_log@` (logs). Files starting with the legacy `openclew@` prefix are still parsed. Files starting with other prefixes (e.g. `R.AlphA.Doc@`) are not parsed by the openclew toolchain but remain valid Markdown.

---

## Complete examples

### Ref example

```markdown
clw_ref@0.7.0 · created: 2026-03-07 · updated: 2026-03-20 · status: Active · category: Auth · keywords: [JWT, sessions, Redis]

- **subject:** Authentication architecture
- **doc_brief:** JWT-based auth with refresh tokens. Sessions stored in Redis with 15-min expiry. Google OAuth as sole provider. Token refresh handled client-side.

---

# Summary

## Objective
Document the auth architecture so agents and new devs can work on auth-related code without re-investigating.

## Key points
- JWT access tokens (15 min) + refresh tokens (7 days)
- Redis for session storage (not Postgres -- latency matters)
- Google OAuth only (no email/password)
- Refresh handled client-side via interceptor

## Watch out
- Refresh endpoint has no rate limiting yet -- track issue #42
- Test tokens in .env.test, never commit real secrets

---

# Details

## Token flow
Client -> /auth/google -> JWT + refresh token
Client -> /auth/refresh -> new JWT (if refresh valid)

## Key files
- src/routes/auth.ts -- OAuth + refresh endpoints
- src/middleware/auth.ts -- JWT verification
- src/services/session.ts -- Redis session management

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-20 | Added rate limiting note |
| 2026-03-07 | Initial creation |
```

### Log example

```markdown
clw_log@0.7.0 · date: 2026-03-15 · type: Bug · status: Done · category: Auth · keywords: [token, refresh, race condition]

- **subject:** Fix token refresh race condition
- **doc_brief:** Two concurrent requests could trigger double refresh, invalidating both tokens. Fixed with a mutex in the interceptor. No more 401 cascades.

---

# Summary

## Objective
Fix intermittent 401 errors when multiple API calls happen during token refresh.

## Problem
Two concurrent requests both detect an expired token and both call /auth/refresh. The second call invalidates the first's new token, causing a 401 cascade.

## Solution
Added a refresh mutex in the HTTP interceptor. First request triggers refresh, others wait for the result. Single refresh call per expiry cycle.

---

# Details

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
- Added test: 10 concurrent requests during token expiry -> exactly 1 refresh call
- Manual test: rapid navigation between pages during expiry window
```
