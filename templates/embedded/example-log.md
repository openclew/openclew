clw_log@{{VER}} · date: {{DATE}} · type: Doc · status: Done · category: Setup · keywords: [openclew, init, first-log]

- **subject:** First session — openclew setup
- **doc_brief:** This is your first log. It was created by `openclew init` to show the format. Edit it to describe what you actually did today, then create a real one with `openclew add log "title"`.

---

# Summary

## What happened
<!-- Replace this with what you actually worked on today. Example:
- Set up openclew, filled in doc/ref/ARCHITECTURE.md with our project stack
- Created first real log about the auth refactor
-->

## What I learned
<!-- Anything surprising or worth remembering. Example:
- The L1 brief is the most important part — it's what you'll scan next time
- Logs are frozen (immutable), refs evolve over time
-->

---

# Details

## How this works

A log captures what happened in one session. It's frozen — you never edit it later.

For knowledge that evolves (architecture, conventions, decisions), use refs:
`openclew add ref "Title"`

Each doc has 4 layers:
- **Metadata** (line 1) — for machines and indexing
- **L1** (subject + brief) — the clew: grasp any doc at a glance
- **L2** (summary) — enough context for most decisions
- **L3** (details) — full content, only when needed

Your agent reads the L1s to decide what's relevant, then dives deeper only where needed.
