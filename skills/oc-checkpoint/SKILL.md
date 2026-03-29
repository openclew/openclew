---
name: oc-checkpoint
description: End-of-session checkpoint. Summarizes git activity, creates a session log, and regenerates the doc index. Use at the end of a work session to persist what was done.
user-invocable: true
---

# openclew checkpoint — End-of-session summary

Run this at the end of a work session to capture what happened.

## Command

```bash
npx openclew checkout
```

## What it does

1. Collects today's git activity (commits, changed files, uncommitted changes)
2. Displays a summary table
3. Creates a session log in `doc/log/YYYY-MM-DD_<topic>.md`
4. Optionally regenerates `doc/_INDEX.md` (human-friendly cache)

## When to use

- End of a coding session
- After completing a feature or bug fix
- Before switching to a different project
- When you want to leave a trace for the next session (yours or someone else's)

## Other useful commands

- `npx openclew add ref "Title"` — Create a reference doc for lasting knowledge
- `npx openclew add log "Title"` — Create a log manually (for mid-session notes)
- `npx openclew status` — Health dashboard (missing briefs, stale docs)
- `npx openclew search "query"` — Find docs by keyword
