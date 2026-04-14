<p align="center">
  <img src="https://raw.githubusercontent.com/openclew/openclew/main/assets/logo.png" alt="openclew" width="200">
</p>

# openclew

> Long Life Memory for LLMs

**Your agent forgets. Your project remembers.**

In Greek mythology, Ariadne gave Theseus a *clew* — a ball of thread — to find his way out of the Minotaur's labyrinth. That thread is the etymological origin of the word "clue." It wasn't a map. It wasn't a search engine. It was a continuous trail that connected where you've been to where you are.

That's what openclew does for your project. Every decision, every architectural choice, every hard-won lesson — laid down as a thread that any reader (human or AI) can follow. Not scattered across wikis, chat logs, and CLAUDE.md files that grow until they're unreadable. One trail. One source of truth.

---

## Why this exists

AI agents are powerful, but they're amnesiac. Every new session starts from zero. The usual fixes don't work:

| Approach | What goes wrong |
|----------|----------------|
| CLAUDE.md / .cursorrules | Grows into an unreadable wall of text. Agent loads everything, wastes tokens on irrelevant context |
| Agent memory (Claude, Copilot) | Opaque, not versioned, not shareable with the team |
| Wiki / Notion | Disconnected from the code, goes stale |
| README.md | Not structured for AI consumption |
| Nothing | Re-explain everything every session |

The deeper problem isn't *storage* — it's **navigation**. A project with 50 documents and 200K tokens of knowledge can't be loaded in full. The real question an agent (or a human) needs to answer is:

> **"Should I read this document?"**

Not "does this file contain the word `auth`?" — that's pattern matching. The question is about *relevance*. And you can only answer it if documents are designed to be skimmed before they're read.

---

## The idea: 3 levels of depth

Every openclew document has 3 levels. Same file, different depths — for different needs.

```
┌─────────────────────────────────────────────┐
│  L1 — Metadata                              │
│  type, subject, status, keywords            │
│  → "Should I read this?" — decidable in     │
│     2 seconds, ~40 tokens per doc            │
│  → Auto-indexed, machine-parseable          │
├─────────────────────────────────────────────┤
│  L2 — Summary                               │
│  Objective, key points, solution            │
│  → The full picture in 30 seconds           │
│  → Enough for most decisions                │
├─────────────────────────────────────────────┤
│  L3 — Details                               │
│  Code, examples, history, edge cases        │
│  → Deep-dive only when actually needed      │
│  → Most readers never go here               │
└─────────────────────────────────────────────┘
```

This isn't just an organizational trick — it's a **token efficiency strategy**. A project with 50 docs:

| Strategy | Tokens consumed | Relevance |
|----------|----------------|-----------|
| Load everything | ~200K | Mostly noise |
| Grep for keywords | Variable | Misses context, false positives |
| **Read all L1s, then L2 of relevant docs** | **~2K + 2-3 docs** | **Precise, contextual** |

L1 answers "should I read this?" L2 answers "what do I need to know?" L3 is there when you need the details. Most of the time, you don't.

---

## Two types of docs

| Type | Location | Role | Mutability |
|------|----------|------|------------|
| **Ref** | `doc/ref/SUBJECT.md` | Reference knowledge (architecture, conventions, decisions) | Updated over time |
| **Log** | `doc/log/YYYY-MM-DD_subject.md` | Frozen facts (what happened, what was decided) | Never modified |

**Refs** are your project's brain — they evolve as the project evolves.
**Logs** are your project's journal — immutable records of what happened and why.

Together, they form the thread. The refs tell you where you are. The logs tell you how you got here.

---

## Quick start (2 minutes)

### 1. Install

```bash
npx openclew init
```

This:
- Creates `doc/` with a guide, an example doc, and an example log
- Detects your instruction file (CLAUDE.md, .cursorrules, AGENTS.md...)
- Injects a block that teaches your agent about the doc structure
- Teaches agents to run `openclew peek` to discover docs dynamically

### 2. Start a session with your agent

Ask it:

> Read doc/ref/USING_OPENCLEW.md and document our architecture.

Your agent reads the guide, understands the L1/L2/L3 format, and creates `doc/ref/ARCHITECTURE.md` with your project's actual architecture.

### 3. There is no step 3

Next session, your agent reads the index, finds the doc, has the context. No re-explanation needed. As your project evolves, your agent creates and updates docs during sessions — refs for ongoing knowledge, logs for frozen facts.

The index auto-regenerates on every commit. Never edit it manually.

### CLI commands

```bash
openclew init                    # Set up openclew in your project
openclew add ref <title>         # Create a ref (evolves with the project)
openclew add log <title>         # Create a session log (frozen facts)
openclew search <query>          # Search docs by keyword
openclew checkout                # End-of-session summary
openclew status                  # Documentation health dashboard
openclew mcp                     # Start MCP server (stdio JSON-RPC)
```

### Claude Code slash commands

`openclew init` installs 4 slash commands into Claude Code:

| Command | What it does |
|---------|-------------|
| `/oc-checkout` | End-of-session summary — review actions, create log, commit |
| `/oc-search` | Search project docs by keyword |
| `/oc-init` | Set up openclew in the current project |
| `/oc-status` | Documentation health dashboard |

These work like any Claude Code slash command — type `/oc-` and pick one. No `npx` needed.

<details>
<summary><b>Manual setup</b> — if you prefer not to use the CLI</summary>

1. Create `doc/ref/` and `doc/log/`
2. Copy templates from [`templates/`](templates/) (ref.md, log.md)
3. Add the openclew block to your instruction file (see `doc/ref/USING_OPENCLEW.md` after init for the exact format)
4. Optionally run `openclew index` to generate `doc/_INDEX.md` (human-friendly cache, not required by agents)

</details>

---

## How it works in practice

**Session 1** — You're setting up auth:
```
doc/
├── _ARCHITECTURE.md          # Your stack, main patterns
└── log/
    └── 2026-03-07_setup-auth.md   # What you did, decisions made
```

**Session 5** — New agent session, different feature:
```
Agent runs `openclew peek` (scans doc/ dynamically)
  → Scans all L1s: "Should I read this?"
  → _ARCHITECTURE.md → yes → reads L2
  → setup-auth log → relevant → reads L2
  → Skips the rest
  → Full context in ~1K tokens instead of 50K
```

**Session 20** — Your project has grown:
```
doc/
├── _ARCHITECTURE.md               # Updated 12 times
├── _AUTH.md                       # Extracted when auth got complex
├── _API_CONVENTIONS.md            # Team conventions
├── _KNOWN_ISSUES.md               # Active gotchas
└── log/
    ├── 2026-03-07_setup-auth.md
    ├── 2026-03-10_migrate-db.md
    ├── 2026-03-15_fix-token-refresh.md
    └── ... (20 more)
```

30 docs. The agent scans all L1s in 2 seconds, reads the 3 that matter, and starts working with full context. A new teammate does the same — reads L2s to get up to speed in minutes. Same docs, same truth, different depth.

---

## Principles

- **"Should I read this?"** — L1 exists to answer this question. If it can't, the L1 is poorly written.
- **Shared knowledge** — Same docs for humans and AI. One source, multiple readers.
- **SSOT** (Single Source of Truth) — Each piece of information lives in one place.
- **Logs are immutable** — Once written, never modified. Frozen facts.
- **Refs evolve** — They evolve as the project evolves.
- **Agents use dynamic scan** — `peek` and `search` scan `doc/` at runtime. `_INDEX.md` is an optional cache for humans (`openclew index`).

---

## Works with everything

**AI agents:** Claude Code, Cursor, Copilot, Windsurf, Codex, Zed, Kiro, Aider, Cline, Gemini CLI...

**Workflow frameworks:** BMAD, Spec Kit, or any methodology — openclew handles knowledge, your framework handles process.

**What the CLI does for you:**
- Detects your instruction file (CLAUDE.md, .cursorrules, AGENTS.md, copilot-instructions...)
- Injects a knowledge block that teaches your agent about the doc structure
- Generates and regenerates the index on every commit (pre-commit hook)
- Searches docs by keyword with weighted scoring (`openclew search`)
- Exposes docs via MCP server for tool-aware agents (`openclew mcp`)
- Produces a session summary at end of work (`openclew checkout`)

**What you get:** plain Markdown files. Git-versioned, diffable, reviewable in PRs. Zero npm dependencies — Node 16+ is all you need. No lock-in: if you stop using the CLI, the docs are still useful — to humans and agents alike.

---

## Compared to alternatives

| Feature | CLAUDE.md | Cline Memory Bank | BMAD | openclew |
|---------|-----------|-------------------|------|----------|
| Readable by humans AND agents | partial | partial | yes | **yes** |
| Levels of depth (L1/L2/L3) | - | - | - | **yes** |
| "Should I read this?" (L1 triage) | - | - | - | **yes** |
| Token-efficient navigation | - | - | partial | **yes** |
| Auto-generated index | - | - | CSV | **yes** |
| Immutable logs | - | - | - | **yes** |
| Git-versioned | yes | yes | yes | **yes** |
| Cross-project | - | - | - | **yes** |
| Tool-agnostic | Claude only | Cline only | multi | **yes** |

---

## License

Apache 2.0 — use it however you want. Patent protection included.
