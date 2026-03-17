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
| **Living** | `doc/_SUBJECT.md` | Living knowledge (architecture, conventions, decisions) | Updated over time |
| **Log** | `doc/log/YYYY-MM-DD_subject.md` | Frozen facts (what happened, what was decided) | Never modified |

**Living docs** are your project's brain — they evolve as the project evolves.
**Logs** are your project's journal — immutable records of what happened and why.

Together, they form the thread. The living docs tell you where you are. The logs tell you how you got here.

---

## Quick start (5 minutes)

### 1. Create the structure

```bash
mkdir -p doc/log
```

### 2. Copy the templates

Download from [`templates/`](templates/) or create manually:

<details>
<summary><b>templates/living.md</b> — for living knowledge</summary>

```markdown
<!-- L1_START -->
# L1 - Metadata
type: Reference | Architecture | Guide | Analysis
subject: Short title (< 60 chars)
created: YYYY-MM-DD
updated: YYYY-MM-DD
short_story: 1-2 sentences. What this doc covers and what it concludes.
status: Active | Stable | Archived
category: Main domain (e.g. Auth, API, Database, UI...)
keywords: [tag1, tag2, tag3]
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
<!-- Why this document exists -->

## Key points
<!-- 3-5 essential takeaways -->

## Solution
<!-- Recommended approach or pattern -->
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

<!-- Full technical content: examples, code, references... -->

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial creation |
<!-- L3_END -->
```

</details>

<details>
<summary><b>templates/log.md</b> — for frozen facts</summary>

```markdown
<!-- L1_START -->
# L1 - Metadata
date: YYYY-MM-DD
type: Bug | Feature | Refactor | Doc | Deploy
subject: Short title (< 60 chars)
short_story: 1-2 sentences. What happened and what was the outcome.
status: Done | In progress | Abandoned
category: Main domain
keywords: [tag1, tag2, tag3]
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Problem
<!-- What was observed -->

## Solution
<!-- How it was resolved -->
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

<!-- Technical details: code changes, debugging steps, references... -->
<!-- L3_END -->
```

</details>

### 3. Write your first doc

```bash
cp templates/living.md doc/_ARCHITECTURE.md
```

Edit it — describe your project's architecture. Fill in L1 (metadata), L2 (summary), skip L3 if you don't need it yet.

### 4. Point your agent to it

Add this to your `CLAUDE.md`, `.cursorrules`, or `AGENTS.md`:

```markdown
## Project knowledge

Documentation lives in `doc/`. Each doc has 3 levels (L1/L2/L3).
- Read L1 first to decide if you need more
- Living docs: `doc/_*.md` (living knowledge, updated)
- Logs: `doc/log/YYYY-MM-DD_*.md` (frozen facts, never modified)
- Index: `doc/_INDEX.md` (auto-generated, start here)
```

### 5. Auto-generate the index (optional)

Copy [`hooks/generate-index.py`](hooks/generate-index.py) to your project and add it as a pre-commit hook:

```bash
# Option A: git hook
cp hooks/generate-index.py .git/hooks/generate-index.py
echo 'python .git/hooks/generate-index.py && git add doc/_INDEX.md' >> .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Option B: pre-commit framework
# See hooks/README.md for .pre-commit-config.yaml setup
```

The index auto-regenerates on every commit. Never edit it manually.

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
Agent reads doc/_INDEX.md (auto-generated)
  → Scans all L1s: "Should I read this?"
  → _ARCHITECTURE.md → yes → reads L2
  → setup-auth log → relevant → reads L2
  → Skips the rest
  → Full context in ~1K tokens instead of 50K
```

**Session 20** — Your project has grown:
```
doc/
├── _INDEX.md                      # Auto-generated, 30 entries
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
- **Living docs evolve** — They evolve as the project evolves.
- **Index is auto-generated** — Never edit `_INDEX.md` manually.

---

## Works with everything

**AI agents:** Claude Code, Cursor, Copilot, Windsurf, Codex, Zed, Kiro, Aider, Cline, Gemini CLI...

**Workflow frameworks:** BMAD, Spec Kit, or any methodology — openclew handles knowledge, your framework handles process.

**It's just Markdown.** No runtime, no dependencies, no lock-in. Git-versioned, diffable, reviewable in PRs. If you stop using it, the docs are still useful — to humans and agents alike.

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

MIT — use it however you want.
