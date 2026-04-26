---
name: oc-todo
description: Create a TODO doc in doc/todo/ — one task per file. Captures why it matters and what done looks like, not implementation details. The index regenerates automatically.
user-invocable: true
---

# openclew todo — One task, one doc

Create a dedicated TODO document for a task. Unlike a flat `TODO.md` checklist, each TODO gets its own file in `doc/todo/` so it can carry subject, brief, and light context.

## Command

```bash
npx openclew add todo "Title of the TODO"
```

Creates `doc/todo/YYYY-MM-DD_slug.md`.

## How to document a TODO (very short)

Fill in two sections, 1-2 lines each:

- **Why it matters** — the pain or opportunity behind this task
- **Done looks like** — how you'll know it's done

That's it. Don't pre-plan the implementation — those details belong in a log when the work actually starts.

## Entry / exit context (optional but recommended)

Each TODO has two L1 fields linking it to surrounding work:

- **`entry_log:`** — where the TODO came from (a log, an audit, a ref). Fill at creation if the context exists; skip if the idea surfaced cold.
- **`exit_log:`** — where it got resolved. Empty at creation. Filled at closing (via `/oc-checkout` Phase TODO or manually). Can be a dedicated log path or just a free-text session reference.

This makes TODOs traceable in both directions: from a TODO you find the session that closed it; from a session you find the TODOs it advanced (via the log's `targets_todos:` field).

## When to use

- A task is bigger than a checkbox (needs context, rationale, success criteria)
- You want it to appear in the project index alongside refs and logs
- You want to revisit it later and remember *why* it mattered

For trivial checkboxes, stick with `TODO.md` at project root.

## Status lifecycle

- `Open` — not started
- `In progress` — work underway (consider creating a log)
- `Done` — completed (stays in `doc/todo/`, sorted to the bottom of the index)

## Related commands

- `/oc-peek` — Cartographer docs before starting
- `/oc-search "query"` — Find related TODOs, refs, or logs
- `npx openclew add log "Title"` — Create a session log when work starts
