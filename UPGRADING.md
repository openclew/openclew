# Upgrading openclew

openclew evolves. When the format changes, your existing docs still work — parsers
are backward-compatible. But new features expect the current format.

`openclew migrate` bridges the gap.

---

## Quick version

```bash
npm install -g openclew@latest   # or: npx openclew@latest
openclew status                  # shows legacy doc count
openclew migrate                 # dry-run: what would change
openclew migrate --write         # apply
git diff                         # review
git add doc/ && git commit -m "chore: migrate docs to openclew format"
```

---

## When to upgrade

After updating openclew, run `openclew status`. If it reports legacy docs,
run `openclew migrate` to see what needs changing.

You can also check directly:

```bash
openclew migrate
# → 12 to migrate, 45 already current, 0 errors (57 total)
```

No output = nothing to do.

---

## How it works

`migrate` converts docs from older formats to the current openclew format.
It is **safe by default**:

- **Dry-run first** — shows what would change without touching files
- **`--write` to apply** — only modifies files when you explicitly ask
- **Git-friendly** — files are tracked, `git diff` shows exactly what changed
- **Idempotent** — running it twice produces the same result
- **Skips current docs** — only touches files that need updating

### What it converts

| Before | After |
|--------|-------|
| `R.AlphA.Doc@7.0.0` (line 1) | `openclew@0.3.0 · created: ... · type: ... · ...` |
| `subject: Title` (plain L1) | `**subject:** Title` (bold L1) |
| `summary: ...` | `**doc_brief:** ...` |
| `# 📋 L1 · Métadonnées` | _(removed — metadata is on line 1)_ |
| `# 📝 L2 · Résumé` | `# L2 - Summary` |
| `# 🔧 L3 · Détails` | `# L3 - Details` |
| YAML frontmatter (`---`) | Replaced by line 1 + L1 block |
| `status: Vivant` | `status: Active` |
| `status: Terminé` | `status: Done` |

### What it does NOT change

- **L2/L3 body content** — only headers are normalized, your content is untouched
- **Sub-headers** — `## Objective`, `## Key points` etc. are preserved as-is
- **`related_docs` paths** — kept on line 1 but not repointed if you move files
- **Files already in openclew format** — skipped entirely
- **`_INDEX.md`** — auto-generated, never touched

---

## Step by step

### 1. Update openclew

```bash
npm install -g openclew@latest
```

### 2. Check your docs

```bash
openclew status
```

Look for the "Legacy format" line. If it says 0, you're done.

### 3. Preview changes

```bash
openclew migrate
```

This lists every file that would be converted. No files are modified.

### 4. Apply

```bash
openclew migrate --write
```

Each converted file is printed with `✓`.

### 5. Review and commit

```bash
git diff                    # inspect the changes
openclew index              # regenerate the index
git add doc/ && git commit -m "chore: migrate docs to openclew format"
```

### 6. Verify

```bash
openclew status             # should show 0 legacy docs
openclew migrate            # should show "0 to migrate"
```

---

## After migrating

- **New docs** you create with `openclew add ref` / `openclew add log` already
  use the current format. No action needed.
- **Docs created by AI agents** will follow the format they see in your codebase.
  Once your existing docs are migrated, agents will generate in the new format.
- **Empty `doc_brief`** — some old docs may have no brief after migration.
  Run `openclew status` to find them and fill them in.

---

## Version-specific notes

### → 0.4.0 (format migration)

First migration release. Converts from the legacy format (YAML frontmatter,
plain `key: value` L1, emoji headers) to the openclew format (condensed line 1,
bold L1 fields, clean headers).

**Scope**: line 1 + L1 block + L2/L3 main headers.

**Not in scope**: sub-header emojis, `related_docs` repointing, recursive
`doc/` subdirectory scanning (refdocs must be in `doc/_*.md`, not `doc/ref/`).

---

## Limitations

### Flat `doc/` structure required

All openclew tools (search, index, status, migrate) scan `doc/_*.md` for refdocs
and `doc/log/*.md` for logs. Subdirectories like `doc/ref/` are not scanned yet.

If you plan to reorganize into subdirectories, wait for recursive scan support
(tracked in the openclew roadmap).

### `related_docs` are not repointed

If a doc references `related_docs: [doc/_AUTH.md]` and you rename that file,
the reference breaks. `migrate` preserves paths as-is — manual update required.

### Parsers are backward-compatible

Even without migrating, your docs are still readable by openclew tools.
Migration improves consistency and enables new features, but is not blocking.
