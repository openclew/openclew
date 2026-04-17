clw_log@0.9.1 · date: 2026-04-17 · type: Feature · status: Done · category: CLI · keywords: [todo, skill, slash-command, index, peek]

- **subject:** Added /oc-todo skill — one TODO per doc in doc/todo/ with auto-generated index
- **doc_brief:** Introduced a third doc kind alongside refs and logs. Each TODO lives in `doc/todo/YYYY-MM-DD_slug.md` with a minimal template (Why it matters / Done looks like). The flat root `TODO.md` stays untouched — the new structure supersedes it without overwriting. Index, search, and peek all recognize the new kind.
- **related_docs:** doc/ref/FORMAT.md, doc/ref/INIT.md

---

# Summary

## Objective

Give each task its own doc so it can carry subject, brief, and rationale — not just a checkbox. Keeps the TODO discoverable in the index alongside refs and logs.

## Problem

The flat `TODO.md` at project root is fine for trivial checkboxes, but it can't carry context. A task like "fix search relevance scoring" needs rationale and a definition of done that a checkbox doesn't support. Users were either forgetting why a TODO mattered, or reinventing a separate doc convention per project.

## Solution

- **New kind**: `clw_todo@VERSION` marker on line 1, parallel to `clw_ref@` / `clw_log@`.
- **New directory**: `doc/todo/YYYY-MM-DD_slug.md` — one file per task.
- **Minimal template**: L1 subject + doc_brief, then two short sections (`Why it matters`, `Done looks like`). Intentionally short — implementation details belong in a log when work starts.
- **Slash-command-first UX**: `/oc-todo "Title"` is the entry point. Users never type `openclew add todo` themselves.
- **Index**: `doc/_INDEX.md` gains a **## TODOs** section. Open/In progress sorted first, Done at the bottom.
- **Peek**: lists Open TODOs so agents see them when cartographing before work.
- **Search**: parses `clw_todo@`, scans `doc/todo/`, displays `☐` icon.

The existing `TODO.md` at project root is **not** touched. Both can coexist — projects migrate at their own pace.

---

# Details

## Files created

| File | Role |
|------|------|
| `lib/new-todo.js` | Creates `doc/todo/YYYY-MM-DD_slug.md` from template |
| `skills/oc-todo/SKILL.md` | User-invocable skill with short documenting guidance |
| `commands/oc-todo.md` | Claude Code slash command `/oc-todo "Title"` |
| `templates/todo.md` | Reference template (parallel to `templates/ref.md` / `log.md`) |

## Files modified

| File | Change |
|------|--------|
| `lib/templates.js` | Added `todoDocContent(title)` |
| `lib/search.js` | `parseMetadataLine()` recognizes `clw_todo@`, `collectDocs()` scans `doc/todo/`, icon `☐` |
| `lib/index-gen.js` | New `## TODOs` section, tri-kind stats (refs / todos / logs), Open-first sort |
| `lib/peek.js` | Reports Open/In progress TODOs |
| `lib/init.js` | Creates `doc/todo/` alongside `doc/ref/` and `doc/log/` |
| `bin/openclew.js` | Dispatches `add todo` and bare `todo` commands |

## Status lifecycle

- `Open` — not started
- `In progress` — work underway (a log should be created when this transitions)
- `Done` — completed; the file stays in `doc/todo/` and sorts to the bottom of the index

Done TODOs stay put (not moved to `doc/log/`) — simpler, keeps the trace alongside the origin.

## Template contract

```
clw_todo@VERSION · created: YYYY-MM-DD · status: Open · priority: Normal · category: · keywords: []

- **subject:** <title>
- **doc_brief:**

---

# Summary

## Why it matters
## Done looks like
```

The guidance is "fill in 2 short sections, 1-2 lines each." If the doc grows beyond ~20 lines, it's probably a ref, not a TODO.

## Isolation test

- `/tmp/openclew-todo-test/` — 3 TODOs created with varied statuses
- Index generated: `0 refs, 3 todos, 0 logs`, Open/In progress first, Done last
- `peek` reports 2 Open TODOs (excludes the Done one)
- `search "search"` matches both semantic + relevance TODOs
- Filename collision returns exit 1 with a clear message

## Open items

- Slash command not yet propagated to `~/.claude/commands/` — users re-running `openclew init` in any project will get it installed (handled by `installSlashCommands()` in `lib/init.js`, which copies everything in `commands/*.md`)
- No Rust port yet — same as other new commands
- No migration tool from `TODO.md` flat list → `doc/todo/*.md` one-per-task. Manual migration on demand
