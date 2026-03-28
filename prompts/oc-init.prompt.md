---
description: "Set up openclew in the current project"
---

Run `npx openclew init` to set up structured documentation.

Display what was created. Then propose filling in `doc/_ARCHITECTURE.md` based on the current project structure (main directories, stack, key files).

## Important

All docs in `doc/` MUST follow the openclew format:
- Line 1: `openclew@VERSION · date: YYYY-MM-DD · type: Reference · status: Active · category: <cat> · keywords: [...]`
- L1 block between `<!-- L1_START -->` and `<!-- L1_END -->` with `**subject:**` and `**doc_brief:**`
- L2 block between `<!-- L2_START -->` and `<!-- L2_END -->` with summary
- L3 block (optional) between `<!-- L3_START -->` and `<!-- L3_END -->` with details

Never create docs without this structure. The markers are essential for indexing and search.
