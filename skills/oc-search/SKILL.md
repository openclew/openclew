---
name: oc-search
description: Search project documentation by keyword. Searches L1 metadata (subject, doc_brief, category, keywords) across all refs and logs. Returns results sorted by relevance.
user-invocable: true
---

# openclew search — Find relevant docs

Search your project's knowledge base by keyword.

## Command

```bash
npx openclew search "<query>"
```

## Examples

```bash
npx openclew search "auth"           # Find docs about authentication
npx openclew search "API design"     # Multi-word search
npx openclew search "bug"            # Find bug-related logs
```

## What it searches

- **subject** (weight: 3×) — document title
- **doc_brief** (weight: 2×) — one-line summary
- **keywords** (weight: 2×) — tags
- **category** (weight: 1.5×) — domain
- **type** (weight: 1×) — Reference, Guide, Bug, Feature...
- **status** (weight: 0.5×) — Active, Done, Archived...

## Reading results

Each result shows:
- Icon: 📘 ref or 📝 log
- Subject and status
- File path (relative)
- Brief description

After finding a doc, read it at the level you need:
- **L1** (between `L1_START`/`L1_END`) — subject + brief, ~40 tokens
- **L2** (between `L2_START`/`L2_END`) — summary, essential context
- **L3** (between `L3_START`/`L3_END`) — full details, only when deep-diving
