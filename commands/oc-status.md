<!-- openclew-managed -->
# oc-status — Documentation health dashboard

Display the health status of project documentation.

**Usage:** `/oc-status`

## Sequence

1. Run `npx openclew status` to get the dashboard
2. Display results to the user
3. If issues found, propose actions:
   - **Missing doc_brief**: "These docs have empty briefs — want me to fill them in?"
   - **Stale docs**: "These docs haven't been updated in a while — want me to review them?"
   - **No recent logs**: "No log created recently — want me to create one for this session?"

## Related commands

- `/oc-search <query>` — Search docs by keyword
- `/oc-checkout` — End-of-session summary (also creates logs)
