clw_ref@0.9.1 · created: 2026-03-30 · updated: 2026-04-23 · doc_version: 1.1.0 · type: Reference · status: Active · category: Format · keywords: spec, L1, L2, L3, metadata, template, parser, doc_version
- **subject:** openclew document format specification
- **doc_brief:** Every openclew doc is built in 4 progressive layers — metadata for machines, L1 as the clew to grasp the subject at a glance, L2 for a one-screen summary, and L3 for the full details. You only go deeper when you need to.

---

# Summary

## Objective
Never get lost in your own docs. Every document carries its own clew (L1): in a few words, a human grasps the subject at a glance — and only digs deeper when needed. AI agents benefit too, but the primary reader is human.

## Key points
- **Line 1** — condensed metadata (`key: value` separated by ` · `). For machines and indexing, not for reading.
- **L1 = the clew** — `**subject:**` + `**doc_brief:**` between line 1 and first `---`. ~40 tokens. Answers: "does this concern me?" A human scanning 20 docs only reads the L1s. If the brief is good, they know in 3 seconds where to dig.
- **L2** — summary in one screen (~40 lines). Enough context for most decisions, without diving into details.
- **L3** — everything else. Code, examples, deep dives. You only go there when you need to.
- **doc_brief rule**: state what is true/decided, not what the document contains. If it starts with "this document describes…", it's meta — rewrite.

## Line 1 prefix

| Prefix | Doc type | Example |
|--------|----------|---------|
| `clw_ref@VERSION` | Ref | `clw_ref@0.7.0 · created: 2026-04-10 · ... · doc_version: 1.0.0 · ...` |
| `clw_log@VERSION` | Log | `clw_log@0.7.0 · date: 2026-04-10 · ...` |
| `clw_todo@VERSION` | TODO doc | `clw_todo@0.9.1 · created: 2026-04-17 · status: Open · ...` |
| `openclew@VERSION` | Legacy (both) | Supported by parser, not generated |

## File naming

| Type | Location | Convention |
|------|----------|------------|
| Refs | `doc/ref/SUBJECT.md` | UPPER_SNAKE_CASE, no prefix |
| Refs (legacy) | `doc/_SUBJECT.md` | UPPER_SNAKE_CASE, prefixed `_` |
| Logs | `doc/log/YYYY-MM-DD_subject.md` | lowercase-with-hyphens, dated |
| TODOs | `doc/todo/YYYY-MM-DD_subject.md` | lowercase-with-hyphens, dated |
| Index | `doc/_INDEX.md` | Auto-generated, never edit |

## Watch out
- Line 1 **must** start with `clw_ref@`, `clw_log@`, `clw_todo@`, or `openclew@` — other prefixes are ignored by parsers
- L1 block is **positional**: lines between line 1 and first `---` separator
- Legacy div markers (`<div class="oc-l1">`) and comment markers (`<!-- L1_START -->`) still supported as fallback

---

# Details

## Line 1 fields

| Field | Ref | Log | TODO | Description |
|-------|:------:|:---:|:----:|-------------|
| `clw_ref@` / `clw_log@` / `clw_todo@VERSION` | yes | yes | yes | **openclew format version** the doc conforms to. Immutable except on format migration. Do **not** bump when editing content. |
| `created` | yes | — | yes | Creation date |
| `updated` | yes | — | — | Last update date |
| `doc_version` | yes | — | — | **Document content version** (semver). Bump on significant edits. Starts at `1.0.0`. Distinct from `clw_ref@`. |
| `date` | — | yes | — | Session date |
| `type` | yes | yes | — | Document type |
| `status` | yes | yes | yes | Document status |
| `priority` | — | — | yes | TODO urgency (Low / Normal / High) |
| `category` | yes | yes | yes | Main domain (free text) |
| `keywords` | yes | yes | yes | Tags for search (comma-separated) |

## Types

| Type | Usage |
|------|-------|
| `Reference` | Durable knowledge (architecture, conventions, decisions) |
| `Architecture` | Structural design document |
| `Guide` | How-to, onboarding, process explanation |
| `Analysis` | Investigation, comparison, study |
| `Bug` | Bug investigation and fix |
| `Feature` | New functionality |
| `Refactor` | Code restructuring |
| `Doc` | Documentation-only change |
| `Deploy` | Deployment or release |

## Statuses

| Status | Ref | Log | TODO | Description |
|--------|:------:|:---:|:----:|-------------|
| `Active` | yes | — | — | Living document, actively maintained |
| `Stable` | yes | — | — | Mature, rarely updated |
| `Archived` | yes | — | — | No longer relevant, kept for history |
| `Open` | — | — | yes | TODO not started |
| `In progress` | — | yes | yes | Work ongoing |
| `Blocked` | — | — | yes | TODO waiting on external input |
| `Done` | — | yes | yes | Work completed |
| `Abandoned` | — | yes | — | Work stopped, approach not viable |

## Parser behavior (`lib/search.js`)

1. `parseMetadataLine()`: reads line 1, matches prefix (`clw_ref@`, `clw_log@`, `clw_todo@`, `openclew@`), splits on ` · `, parses `key: value` pairs
2. `findL1Block()`: 3-level fallback — div → comment markers → positional (between line 1 and first `---`)
3. `parseL1()`: regex extracts `**subject:**` and `**doc_brief:**` from L1 block
4. Legacy fallback: if no `**subject:**` found, tries plain `key: value` lines

## Relation to templates

| Source | Role |
|--------|------|
| `templates/FORMAT.md` | **SSOT** — canonical spec (this file) |
| `templates/ref.md` | Template for `openclew add ref` |
| `templates/log.md` | Template for `openclew add log` |
| `templates/todo.md` | Template for `openclew add todo` (also `/oc-todo`) |
| `lib/templates.js` | Embedded templates (standalone CLI, no filesystem read) |

This document (`doc/ref/FORMAT.md`) is a ref **about** the format, written **in** the format — dogfooding.
