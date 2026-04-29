# openclew — Agent Instructions

## What this project is

openclew is a CLI tool (`npx openclew`) that sets up structured project documentation for AI agents. It creates a `doc/` directory with L1/L2/L3 layered Markdown files and an auto-generated index.

**Stack**: Node.js CLI (zero dependencies). Pure JavaScript — no Python required.

## Commands

```bash
node bin/openclew.js init          # Initialize openclew in a project
node bin/openclew.js new "Title"   # Create a ref (_TITLE.md)
node bin/openclew.js log "Title"   # Create a log (YYYY-MM-DD_title.md)
node bin/openclew.js index         # Regenerate _INDEX.md
node bin/openclew.js help          # Show usage
```

## Key files

| File | Role |
|------|------|
| `bin/openclew.js` | CLI entry point (command dispatcher) |
| `lib/init.js` | `init` command — creates doc structure, injects block, sets hook |
| `lib/detect.js` | Detects instruction files (CLAUDE.md, AGENTS.md, .cursorrules…) |
| `lib/inject.js` | Injects openclew block into instruction file via markers |
| `lib/config.js` | Read/write `.openclew.json` (entry point config) |
| `lib/templates.js` | Embedded templates + helpers (slugify, today) |
| `lib/new-doc.js` | Creates `doc/_TITLE.md` from ref template |
| `lib/new-log.js` | Creates `doc/log/YYYY-MM-DD_title.md` from log template |
| `lib/index-gen.js` | Pure JS index generator — parses L1 blocks, generates `doc/_INDEX.md` |
| `lib/search.js` | SSOT parsers (metadata, L1) — reused by index-gen, search, MCP |
| `templates/ref.md` | Reference template for refs |
| `templates/log.md` | Reference template for logs |

## Doc format

Every doc has a metadata line + 3 levels:

```markdown
openclew@0.2.0 · date: YYYY-MM-DD · type: Feature · status: Done · category: Auth · keywords: [tag1, tag2]

<!-- L1_START -->
**subject:** One-line description

**doc_brief:** What happened and what it means (1-2 sentences)
<!-- L1_END -->

<!-- L2_START -->
## Summary
Human-readable overview.
<!-- L2_END -->

<!-- L3_START -->
## Details
Full technical details.
<!-- L3_END -->
```

**Line 1** — metadata for indexing/triage (version, date, type, status, category, keywords).
**L1** — subject + doc_brief: what the doc is about and what it concludes.
**L2** — summary: objective, key points, decisions.
**L3** — full technical details.

**Two types of docs:**
- `doc/_NAME.md` — refs (updated over time, start with `_`)
- `doc/log/YYYY-MM-DD_subject.md` — logs (immutable, frozen facts)

## Architecture

```
npx openclew <command>
    ↓
bin/openclew.js (dispatcher)
    ↓
lib/*.js (init, new-doc, new-log, index-gen, search, detect, inject, config, templates)
```

## Conventions

- Zero dependencies — Node 16+ only (no Python required since oc_0.3.0)
- Idempotent: every command is safe to re-run
- Entry point stored in `.openclew.json` (default: AGENTS.md, case-insensitive)
- Injection via markers `<!-- openclew_START -->
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

`npx openclew status` warns on any TODO missing `from` and any closed TODO missing `closed`. Completed items older than 7 days are auto-purged.

### Rules

- **No matching doc? Propose creating a ref** — suggest `npx openclew add ref "Title"` to capture key information before writing code. Logs are for end-of-session summaries only.
- **Missing information? Ask, don't guess.** If the task requires knowledge beyond this project, ask the user.
- **Format is mandatory.** Use `npx openclew add ref` or `npx openclew add log` to create docs — never from scratch.
- **Keep responses short.** Break large tasks into steps and confirm before proceeding.

### Commands

If an openclew MCP server is connected, prefer tool calls (`list_docs`, `read_doc`, `search_docs`). Otherwise use CLI:

- `npx openclew peek` — list all docs with subject and status
- `npx openclew search "query"` — search docs by keyword
- `npx openclew add ref "Title"` — create a ref
- `npx openclew add log "Title"` — create a session log
- `npx openclew checkout` — end-of-session summary
- `npx openclew status` — documentation health dashboard

### IMPORTANT — Start of every conversation

You MUST do this before ANY task, no exceptions:

1. **List docs** — call `list_docs` (MCP) or run `npx openclew peek`
2. **Pick** — identify which refs relate to the user's request
3. **Read** — read the relevant docs (L1 for quick scan, L2 for context)
4. **Only then** — start working

Skipping this step means you will miss architecture decisions, known pitfalls, and conventions — and produce wrong or redundant work.
<!-- openclew_END -->`
