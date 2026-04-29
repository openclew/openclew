<!-- openclew-managed -->
# oc-todo — Add a TODO

Two formats coexist:

| Format | Where | When to use |
|---|---|---|
| **Flat** (default) | `TODO.md` at project root | Most TODOs — short, plain checklist |
| **File** (opt-in) | `doc/todo/YYYY-MM-DD_slug.md` | Complex TODOs needing subject/brief/context |

Both formats follow the same **from/closed** rule: every TODO carries `from` (creation context), every checked TODO also carries `closed` (closure reference).

**Usage:** `/oc-todo "Title of the TODO"`

## Flat format (default)

Append a line to `TODO.md` at the project root:

```markdown
- [ ] **Title of the TODO** : Short description. <!-- from: doc/log/2026-04-29_session.md -->
```

**Rule — `from` is required, even cold:**
- If the idea came from a session/audit/ref → use that path: `<!-- from: doc/log/2026-04-26_audit.md -->`
- If it surfaced out-of-band → free-text is fine: `<!-- from: 2026-04-29 — cold idea -->`

`closed` stays absent until the TODO is closed. At closing (manually or via `/oc-checkout` Phase TODO), check the box and append:

```markdown
- [x] **Title** : Description (2026-04-29). <!-- from: doc/log/2026-04-26_audit.md --> <!-- closed: doc/log/2026-04-29_session.md -->
```

`closed` accepts a log path or a free-text session reference (`2026-04-29 session — handled inline`).

`openclew status` warns on any TODO missing `from`, and any `[x]` missing `closed`.

## File format (opt-in)

Use when the TODO needs a real description, decisions, or links to several refs.

```bash
npx openclew add todo "$ARGUMENTS"
```

Creates `doc/todo/YYYY-MM-DD_slug.md`. Fill in:
- **Why it matters** — pain or opportunity (1–2 lines)
- **Done looks like** — completion signal (1–2 lines)
- L1 field `from:` — same rule as flat `from` (always required)

`closed:` stays empty until closure. See `doc/ref/FORMAT.md`.

## Rules

- **`from` mandatory at creation.** Free-text accepted; never omit.
- **`closed` mandatory at closing.** Backfill if missing.
- **Two-way link:** when a TODO is closed via `/oc-checkout`, the session log gets `targets_todos:` pointing back to the TODO.
- Don't pre-plan the implementation — that goes in a log when work starts.

## Related commands

- `/oc-peek` — Cartographer docs before starting
- `/oc-search "query"` — Find related TODOs, refs, or logs
- `/oc-checkout` — Phase TODO closes open TODOs at end of session
- `npx openclew status` — Surfaces TODOs missing from/closed markers
