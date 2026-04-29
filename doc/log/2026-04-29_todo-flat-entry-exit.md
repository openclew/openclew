clw_log@0.9.1 · date: 2026-04-29 · type: Feature · status: Done · category: Format · keywords: [todo, from, closed, flat, traceability, status]

- **subject:** Extended entry/exit traceability to flat TODO.md, renamed markers to from/closed
- **doc_brief:** Flat `TODO.md` lines now carry `<!-- from: ... -->` and `<!-- closed: ... -->` HTML comments. Both required: `from` always, `closed` when checked. Free-text accepted. Parser at `lib/todo-flat.js`. `openclew status` warns on missing markers. `oc-checkout`, `oc-todo`, FORMAT.md, templates and `lib/search.js` parser all aligned. Legacy L1 fields `entry_log`/`exit_log` (file format) renamed to `from`/`closed` for one-name-everywhere.
- **related_docs:** doc/ref/FORMAT.md, doc/log/2026-04-27_todo-entry-exit-context.md
- **targets_todos:** TODO.md line 17 (TODOs ↔ sessions: lien manquant dans les deux sens — flat-format extension + naming pass)

---

# Summary

## Objective

The 2026-04-27 work added `entry_log` / `exit_log` / `targets_todos` fields, but only on the file format (`doc/todo/*.md`). Nobody uses that format — every R.AlphA project (and openclew itself) keeps a flat `TODO.md` at the root. The traceability rule had no enforcement on the format actually in use.

This session does two things:
1. Extends the rule to flat `TODO.md` via inline HTML-comment markers.
2. Renames the markers / L1 fields from `entry_log` / `exit_log` to **`from`** / **`closed`** (shorter, more natural to read).

## Decision

| Field | When required |
|---|---|
| `from`   | **Always** — at creation. Free-text accepted. |
| `closed` | **When checked** (`- [x]`). Free-text accepted. |

`openclew status` warns on any TODO missing `from`, and any closed TODO missing `closed`. No silent omission.

## Changes

| Component | Change |
|---|---|
| `lib/todo-flat.js` (new) | Parser, validator, marker editor for flat TODO.md (`from` / `closed` regex, `validateFlatTodos`, `setMarkers`) |
| `lib/status.js` | Replaces basic regex stats with `parseFlatTodos` + `validateFlatTodos` warnings; file-format check renamed to `closed` / `from` |
| `lib/search.js` | `parseL1` reads `**from:**` / `**closed:**` (replaces `entry_log` / `exit_log`) |
| `lib/templates.js` + `templates/todo.md` | New L1 fields `from:` / `closed:` |
| `commands/oc-checkout.md` | Phase 3bis rewritten: handles flat TODO.md primarily, file format secondarily, new naming |
| `commands/oc-todo.md` + `skills/oc-todo/SKILL.md` | Documents flat as default, file as opt-in, `from` / `closed` rule |
| `doc/ref/FORMAT.md` | doc_version 1.2.0 → 1.3.0. Documents the flat markup, tightens optional → required, new naming with legacy note |

## Markup

```markdown
- [ ] **Title** : Description. <!-- from: doc/log/2026-04-26_audit.md -->
- [ ] **Cold** : Description. <!-- from: 2026-04-29 — cold idea -->
- [x] **Done** : Description (2026-04-29). <!-- from: doc/log/2026-04-26_audit.md --> <!-- closed: doc/log/2026-04-29_session.md -->
```

HTML comments — invisible at render time, parseable. Marker order is free.

---

# Details

## Why `from` / `closed`

Previous naming was `entry_log` / `exit_log`. Two issues:
- `_log` suffix is misleading — the value can be a free-text reference, not always a log path.
- `entry` / `exit` are abstract; `from` / `closed` read more naturally in context: "from where", "closed in".

`closed` covers `Done` and `Abandoned` consistently (`done_log` would have been too narrow). The legacy field names are no longer parsed — projects with existing `entry_log:` / `exit_log:` lines need a one-shot rename. `openclew migrate` does not yet handle this; manual sed is straightforward.

## Why tighten to required

The 2026-04-27 spec made all three fields optional. In practice, optional fields don't get filled — the audit on R.AlphA.IDE (44 TODOs) showed that nobody bothers without enforcement. The cost of "always required + free-text accepted" is near-zero (one short string), the value is high (every closed TODO points back to the session that closed it).

Free-text is the safety valve: cold ideas don't need a doc path, just a date or an explanation.

## Test

Ran `openclew status` on `openclew/TODO.md` itself:

```
TODO.md: 14 pending, 5 done
  19 TODO(s) missing from marker
  5 done TODO(s) missing closed marker
```

Cohérent — markup pas encore appliqué aux 19 lignes existantes. Migration de ces lignes = travail de fond, pas inclus dans cette session (on ne force pas la migration en masse, c'est la même politique que pour le format openclew).

Edge cases tested in isolation:
- Cold `from` (free-text) → parsed correctly
- Done with both markers → no warning
- Done missing closed → flagged
- Naked TODO (no markers) → flagged for missing from
- `setMarkers` append / replace / add-closed-on-close → all OK

## Two-way link

When `oc-checkout` Phase TODO closes a TODO:
1. Check the box (`- [ ]` → `- [x]`)
2. Append `<!-- closed: <session log path> -->`
3. Backfill `<!-- from: ... -->` if missing
4. In the session log's L1, append the TODO reference (line number or slug) to `targets_todos:`

Either direction must lead to the other.

## Open items

- No automated migration of existing TODOs (markers simply absent → status warns until filled)
- No automated migration of legacy `entry_log` / `exit_log` L1 fields in `doc/todo/*.md` (openclew has none right now; safe to leave)
- Rust port not updated (status command not yet ported)
- `setMarkers` not yet wired into `oc-checkout` automation — the slash command instructs the agent to do it manually for now
