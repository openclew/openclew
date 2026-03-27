---
name: oc-init
description: Set up openclew structured documentation in the current project. Creates doc/ with L1/L2/L3 knowledge base, auto-generated index, and injects context into your instruction file.
user-invocable: true
---

# openclew init — Set up project knowledge

Run this to add structured documentation to your project.

## What it does

1. Creates `doc/` and `doc/log/` directories
2. Detects your existing instruction file (AGENTS.md, CLAUDE.md, .cursorrules, etc.)
3. Injects a knowledge block so agents automatically consult project docs
4. Creates starter docs: guide, architecture template, example log
5. Generates `doc/_INDEX.md` (auto-rebuilt on every commit)
6. Installs a git pre-commit hook for index regeneration

## Command

```bash
npx openclew init
```

## Options

- `--no-inject` — Skip injection into instruction file
- `--no-hook` — Skip git hook installation

## After setup

Your agent will now read `doc/_INDEX.md` before starting tasks. To add knowledge:

- `npx openclew add ref "Title"` — Create a reference doc (architecture, conventions, decisions)
- `npx openclew add log "Title"` — Create a session log (frozen facts)
- `npx openclew search "query"` — Search existing docs
- `npx openclew checkout` — End-of-session summary

## How it works with OpenClaw

openclew handles **project knowledge** (what your project knows, what was decided, what happened).
OpenClaw handles **agent identity** (personality, memory, tools, messaging).

They're complementary:
- OpenClaw's `MEMORY.md` = your agent's personal memory across all projects
- openclew's `doc/` = this project's shared knowledge across all agents and sessions

openclew injects into your project's `AGENTS.md` (or any instruction file). This doesn't conflict with OpenClaw's workspace `AGENTS.md` — they live in different locations.
