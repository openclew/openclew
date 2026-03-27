<!-- openclew-managed -->
# oc-search — Search project documentation

Search your project's knowledge base by keyword.

**Usage:** `/oc-search <query>`

## Sequence

1. Run `npx openclew search "$ARGUMENTS"` to get results
2. Display results to the user
3. If results found: propose to read the most relevant doc(s) at L2 level
4. If no results: suggest alternative keywords or propose creating a new doc

## Reading results

After finding a doc, read it progressively:
- **L1** (between `L1_START`/`L1_END`) — subject + brief, ~40 tokens. "Should I read this?"
- **L2** (between `L2_START`/`L2_END`) — summary, essential context
- **L3** (between `L3_START`/`L3_END`) — full details, only when deep-diving

## Related commands

- `/oc-status` — Health dashboard (missing briefs, stale docs)
- `/oc-checkout` — End-of-session summary
