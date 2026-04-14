<!-- openclew-managed -->
# oc-peek — Discover project knowledge before working

First reflex before exploring a project: shows the instruction file and lists all available docs.

**Usage:** `/oc-peek` (no arguments, uses the current project)

## Sequence

### Step 1: Run the CLI

```bash
npx openclew peek
```

This lists:
- The instruction file (CLAUDE.md / AGENTS.md) path
- All refs in `doc/` with their subjects
- All `_*.md` files outside `doc/` (prompts, scripts, etc.)
- Subdirectories of `doc/`

### Step 2: Display the instruction file

Read the instruction file (CLAUDE.md or AGENTS.md) and display it **in full** — do not summarize.

### Step 3: Display the ref list

Display the CLI output as-is. This is a **listing only** — do not read the refs at this stage.

## Rules

- **Do not summarize** the instruction file — display it integrally
- **Do not read** the refs — list file names only
- If no instruction file exists: indicate `(no instruction file found)`
- If no `doc/` directory exists: indicate `(no doc/ directory)`

## Related commands

- `/oc-search <query>` — Search docs by keyword
- `/oc-status` — Documentation health dashboard
- `/oc-checkout` — End-of-session summary
