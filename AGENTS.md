# openclew — Agent Instructions

## What this project is

openclew is a CLI tool (`npx openclew`) that sets up structured project documentation for AI agents. It creates a `doc/` directory with L1/L2/L3 layered Markdown files and an auto-generated index.

**Stack**: Node.js CLI (zero npm dependencies), Python 3.8+ for index generation.

## Commands

```bash
node bin/openclew.js init          # Initialize openclew in a project
node bin/openclew.js new "Title"   # Create a living doc (_TITLE.md)
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
| `lib/new-doc.js` | Creates `doc/_TITLE.md` from living doc template |
| `lib/new-log.js` | Creates `doc/log/YYYY-MM-DD_title.md` from log template |
| `lib/index-gen.js` | Wrapper that calls `hooks/generate-index.py` |
| `hooks/generate-index.py` | Parses L1 blocks, generates `doc/_INDEX.md` |
| `templates/living.md` | Reference template for living docs |
| `templates/log.md` | Reference template for logs |

## Doc format (L1/L2/L3)

Every doc has 3 delimited sections:

```markdown
<!-- L1_START -->
type: Feature
subject: One-line description
short_story: What happened and what it means (1-2 sentences)
status: Done
keywords: [tag1, tag2]
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

**Two types of docs:**
- `doc/_NAME.md` — living docs (updated over time, start with `_`)
- `doc/log/YYYY-MM-DD_subject.md` — logs (immutable, frozen facts)

## Architecture

```
npx openclew <command>
    ↓
bin/openclew.js (dispatcher)
    ↓
lib/*.js (init, new-doc, new-log, index-gen, detect, inject, config, templates)
    ↓
hooks/generate-index.py (L1 parser → _INDEX.md)
```

## Conventions

- Zero npm dependencies — Node 16+ and Python 3.8+ standard library only
- Idempotent: every command is safe to re-run
- Entry point stored in `.openclew.json` (default: AGENTS.md, case-insensitive)
- Injection via markers `<!-- openclew_START -->` / `<!-- openclew_END -->`
