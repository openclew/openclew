---
description: "End-of-session summary — collect actions, propose logs, commit"
---

Run `npx openclew checkout` to collect git activity.

Then generate a structured summary:

1. List all actions from the session (features, fixes, refactors)
2. For each action, check: is it documented? is it committed?
3. Display a recap table
4. List refdocs related to the session — flag those that need updating
5. Propose creating logs for undocumented actions — **logs MUST use the openclew format below**
6. Wait for user validation before committing

## Log format (mandatory)

Every log created by this command MUST follow this exact structure:

```
openclew@0.5.3 · date: YYYY-MM-DD · type: Log · status: Done · category: <category> · keywords: [kw1, kw2]

<!-- L1_START -->
**subject:** One-line description of what happened

**doc_brief:** One sentence: what was done and why. Not meta ("this document describes...") but concrete ("Fixed auth timeout by increasing proxy_read_timeout").
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## What happened
- Bullet points of concrete actions

## Key decisions
- Why this approach was chosen
<!-- L2_END -->
```

**Rules:**
- Line 1 = metadata (single line, no YAML frontmatter)
- L1 = subject + doc_brief between L1_START/L1_END markers
- L2 = summary between L2_START/L2_END markers
- L3 = optional, only for complex sessions
- **Never** create a log without L1_START/L1_END markers
- **Never** use plain markdown without the openclew structure
