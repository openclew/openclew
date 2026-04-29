---
name: oc-todo
description: Add a TODO. Two formats — flat TODO.md (default) or one file per TODO (opt-in). Both follow the from/closed rule for two-way traceability with session logs.
user-invocable: true
---

# openclew todo — from/closed traceability

A TODO must always state **where it came from** (`from`) and, when checked, **where it got closed** (`closed`). Two-way link with session logs via `targets_todos:`.

## Two formats

| Format | Where | When |
|---|---|---|
| **Flat** | `TODO.md` at project root | Default — short checklist items |
| **File** | `doc/todo/YYYY-MM-DD_slug.md` | Opt-in — when a TODO needs subject, brief, real context |

## Flat format

```markdown
- [ ] **Title** : Description. <!-- from: doc/log/2026-04-26_audit.md -->
- [x] **Done title** : Description (2026-04-29). <!-- from: doc/log/2026-04-26_audit.md --> <!-- closed: doc/log/2026-04-29_session.md -->
```

- `from` is a **doc path** when context exists, or **free-text** otherwise (`2026-04-29 — cold idea`)
- `closed` is filled at closing — doc path or session reference (`2026-04-29 session — handled inline`)

## File format

```bash
npx openclew add todo "Title"
```

Fill **Why it matters** + **Done looks like** (1–2 lines each). Set L1 `from:` at creation. `closed:` stays empty until closure. Spec: `doc/ref/FORMAT.md`.

## Rule (both formats)

| Field | When required |
|---|---|
| `from`   | Always — at creation. Free-text accepted. Never omit. |
| `closed` | When checked / `status: Done`. Free-text accepted. |

`openclew status` flags any TODO missing `from` or any closed TODO missing `closed`.

## When file format wins

- Task needs a real description, decisions, links to multiple refs
- Should appear in the index alongside refs/logs
- You'll want to revisit *why* it mattered

For trivial checkboxes → flat.

## Status lifecycle (file format)

`Open` → `In progress` → `Done` (stays in `doc/todo/`).

## Related

- `/oc-peek` — Cartographer docs before starting
- `/oc-search "query"` — Find related TODOs, refs, or logs
- `/oc-checkout` — Phase TODO closes open items + writes the two-way link
- `npx openclew status` — Surfaces TODOs missing from/closed markers
