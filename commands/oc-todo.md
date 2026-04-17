<!-- openclew-managed -->
# oc-todo — Create a TODO doc (one task per file)

Creates `doc/todo/YYYY-MM-DD_slug.md`. Unlike a flat `TODO.md` checklist, each TODO gets its own file so it can carry subject, brief, and context.

**Usage:** `/oc-todo "Title of the TODO"`

## Sequence

### Step 1: Run the CLI

```bash
npx openclew add todo "$ARGUMENTS"
```

This creates `doc/todo/YYYY-MM-DD_slug.md` with a minimal template.

### Step 2: Guide the user to fill in two short sections

Open the created file and fill in (1-2 lines each, no more):

- **Why it matters** — the pain or opportunity behind this task
- **Done looks like** — how you'll know it's done

Do **not** pre-plan the implementation — implementation details belong in a log when work actually starts.

### Step 3: Regenerate the index (optional)

```bash
npx openclew index
```

This updates `doc/_INDEX.md` with a TODOs section (auto-generated on commit if the hook is installed).

## Rules

- Keep the doc short — if it grows beyond ~20 lines, it's probably a ref, not a TODO
- Don't add implementation details — they go in a log when work starts
- Status `Open` → `In progress` → `Done`. Done TODOs stay in `doc/todo/` (not moved to `doc/log/`)

## Related commands

- `/oc-peek` — Cartographer docs before starting
- `/oc-search "query"` — Find related TODOs, refs, or logs
- `npx openclew add log "Title"` — Create a session log when work starts
