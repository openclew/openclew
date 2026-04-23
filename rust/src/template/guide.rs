use crate::util::{oc_version, today};

/// Guide doc — always created by init.
/// This is what agents read to understand openclew.
pub fn guide_content() -> String {
    let date = today();
    let ver = oc_version();
    format!(
        r#"clw_ref@{ver} · created: {date} · updated: {date} · doc_version: 1.0.0 · type: Guide · status: Active · category: Documentation · keywords: [openclew, L1, L2, L3, index, ref, log]

- **subject:** How openclew works
- **doc_brief:** How openclew structures project knowledge in 3 levels (L1/L2/L3) so AI agents and humans navigate efficiently.

---

# Summary

## What is openclew?

openclew gives your project a structured memory that both humans and AI agents can navigate efficiently.

## Doc-first rule

Before starting any task, run `openclew peek` to list all docs with their subject and status. Pick relevant ones, read them before exploring code. This avoids reinventing what's already documented.

## Two types of docs

**Refs** (`doc/ref/*.md`): knowledge that evolves with the project.
Architecture decisions, conventions, known pitfalls — anything that stays relevant over time.
Naming: `doc/ref/UPPER_SNAKE_CASE.md` (e.g. `doc/ref/AUTH_DESIGN.md`)

**Logs** (`doc/log/YYYY-MM-DD_*.md`): frozen facts from a work session.
What happened, what was decided, what was tried. Never modified after the session.
Naming: `doc/log/YYYY-MM-DD_lowercase-slug.md` (e.g. `doc/log/2026-01-15_setup-auth.md`)

## Document structure

Every doc has a metadata line + 3 levels. Read only what you need:

**Line 1 — Metadata**: version, date, type, status, category, keywords. For indexing and triage.

**L1 — Subject + Brief** (~40 tokens): what the doc is about and what it concludes. Read this first to decide if the doc is relevant.

**L2 — Summary**: the essential context — objective, key points, decisions.

**L3 — Details**: full technical content. Only read when deep-diving.

## Discovering docs

Run `openclew peek` to list all docs, or `openclew search "query"` to find docs by keyword. Both scan `doc/` dynamically — no index file needed.

An optional `doc/_INDEX.md` can be generated with `openclew index` for human browsing (e.g. on GitHub), but agents should use `peek` or `search` instead.

---

# Details

## Creating a ref

Create `doc/ref/TITLE.md` (uppercase snake_case) with this structure:

```
clw_ref@{ver} · created: YYYY-MM-DD · updated: YYYY-MM-DD · doc_version: 1.0.0 · type: Reference · status: Active · category: · keywords: []

- **subject:** Title
- **doc_brief:**

---

# Summary
## Objective
## Key points

---

# Details
```

**When to create one:**
- A decision was made that others need to know (architecture, convention, API design)
- A pattern or pitfall keeps coming up
- You want an agent to know something at the start of every session

## Creating a log

Create `doc/log/YYYY-MM-DD_slug.md` (lowercase, hyphens) with this structure:

```
clw_log@{ver} · date: YYYY-MM-DD · type: Feature · status: In progress · category: · keywords: []

- **subject:** Title
- **doc_brief:**

---

# Summary
## Objective
## Problem
## Solution

---

# Details
```

**When to create one:**
- End of a work session (what was done, what's left)
- A bug was investigated and resolved
- A spike or experiment was conducted

Logs are immutable — once the session ends, the log is never modified.

## How agents should use this

1. At session start: read the entry point file
2. Before any task: run `openclew peek` to list all docs, identify relevant ones
3. Read L1 (subject + brief) of relevant docs to confirm relevance
4. Read L2 for context
5. Only read L3 when you need implementation details
6. After significant work: propose creating or updating a ref

---

## Changelog

| Date | Change |
|------|--------|
| {date} | Created by openclew init |
"#
    )
}
