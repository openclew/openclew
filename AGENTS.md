# openclew — Agent Instructions

openclew is a CLI (native Rust binary since 0.11.0) that sets up structured L1/L2/L3 project documentation for AI agents.

**Working on this repository:** read `doc/ref/DEVELOPPEMENT.md` first — commands, conventions, key files and pitfalls (in French, like the rest of `doc/`). Before any commit: `npm test && cargo test` (there is no CI). Release process: `doc/ref/RELEASE.md`.

<!-- openclew_START -->
## Project knowledge (openclew)

This project uses `doc/` as its knowledge base.

### Doc types

- **Refs** (`doc/ref/*.md` or `doc/_*.md`) — architecture, conventions, decisions (evolve over time)
- **Logs** (`doc/log/YYYY-MM-DD_*.md`) — frozen facts from past sessions

Each doc has 3 levels: **L1** (subject + brief) → **L2** (summary) → **L3** (full details, only when needed). Read L1 first to decide relevance, then go deeper.

### Task tracking

Two formats coexist for TODOs:

- **Flat** (default) — `TODO.md` at project root, one checkbox per line
- **File** (opt-in) — `doc/todo/YYYY-MM-DD_slug.md`, one file per TODO with subject/brief

**Traceability rule (both formats):**

| Field | When required |
|---|---|
| `from`   | **Always** — at creation. Free-text accepted (e.g. `2026-04-29 — cold idea`). Never omit. |
| `closed` | **When checked** (`- [x]`). Free-text accepted (e.g. `2026-04-29 session — handled inline`). |

**Markup — flat `TODO.md`:**

```markdown
- [ ] **Title** : Description. <!-- from: doc/log/2026-04-26_audit.md -->
- [ ] **Cold idea** : Description. <!-- from: 2026-04-29 — cold idea -->
- [x] **Done** : Description (2026-04-29). <!-- from: doc/log/2026-04-26_audit.md --> <!-- closed: doc/log/2026-04-29_session.md -->
```

When the user says "note this as a TODO" / "add to todo": always include `<!-- from: ... -->`. Use the current session's log path if one exists; otherwise free-text (date + short reason).

When closing a TODO: check the box, append `<!-- closed: ... -->`, and add the TODO reference to the session log's L1 `targets_todos:` field (two-way link).

**File format L1 fields:** `from:` and `closed:` (same rule). Spec: `doc/ref/FORMAT.md`.

`openclew status` warns on any TODO missing `from` and any closed TODO missing `closed`. It also flags completed items older than 7 days — purge them **manually**, **archiving** each line (keep the trace; never hard-delete). Spec: `doc/ref/FORMAT.md`.

### Rules

- **No matching doc? Propose creating a ref** — suggest `openclew add ref "Title"` to capture key information before writing code. Logs are for end-of-session summaries only.
- **Missing information? Ask, don't guess.** If the task requires knowledge beyond this project, ask the user.
- **Format is mandatory.** Use `openclew add ref` or `openclew add log` to create docs — never from scratch.
- **Keep responses short.** Break large tasks into steps and confirm before proceeding.

### Commands

If an openclew MCP server is connected, prefer tool calls (`list_docs`, `read_doc`, `search_docs`). Otherwise use CLI (if `openclew` is not found, prefix with `npx`: `npx openclew peek`):

- `openclew peek` — list all docs with subject and status
- `openclew search "query"` — search docs by keyword
- `openclew add ref "Title"` — create a ref
- `openclew add log "Title"` — create a session log
- `openclew checkout` — end-of-session summary
- `openclew status` — documentation health dashboard

### IMPORTANT — Start of every conversation

You MUST do this before ANY task, no exceptions:

1. **List docs** — call `list_docs` (MCP) or run `openclew peek`
2. **Pick** — identify which refs relate to the user's request
3. **Read** — read the relevant docs (L1 for quick scan, L2 for context)
4. **Only then** — start working

Skipping this step means you will miss architecture decisions, known pitfalls, and conventions — and produce wrong or redundant work.
<!-- openclew_END -->
