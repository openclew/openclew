<!-- openclew-managed -->
# oc-init — Set up openclew in the current project

Initialize structured documentation so AI agents and humans navigate project knowledge efficiently.

**Usage:** `/oc-init`

## Sequence

1. Run `npx openclew init`
2. Display what was created
3. Read the generated guide (`doc/_USING_OPENCLEW.md`) to understand the setup
4. Propose creating a first architecture doc:
   - "Want me to create `doc/_ARCHITECTURE.md` based on the current project structure?"
   - If yes: analyze the project (main dirs, stack, key files) and fill in the template

## After setup

The agent will now run `npx openclew peek` to discover docs before starting tasks. Available commands:

- `/oc-search <query>` — Search existing docs
- `/oc-status` — Health dashboard
- `/oc-checkout` — End-of-session summary

To add knowledge manually:
- `npx openclew add ref "Title"` — Create a reference doc
- `npx openclew add log "Title"` — Create a session log
