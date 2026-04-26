clw_log@0.9.1 · date: 2026-04-27 · type: Feature · status: Done · category: Format · keywords: [todo, entry_log, exit_log, targets_todos, traceability]

- **subject:** Added entry_log/exit_log to TODOs and targets_todos to logs — two-way traceability
- **doc_brief:** TODOs gained two optional L1 fields linking them to surrounding work — `entry_log` (where the idea came from) and `exit_log` (where it was resolved). Logs gained `targets_todos` (which TODOs the session worked on). All optional. `status` warns on Done TODOs without `exit_log`. `oc-checkout` gains a Phase TODO sweep.
- **related_docs:** doc/ref/FORMAT.md, doc/log/2026-04-17_oc-todo-skill.md
- **targets_todos:** TODO.md line 17 (TODOs ↔ sessions: lien manquant dans les deux sens)

---

# Summary

## Objective

TODOs were islands. Looking at a TODO, you couldn't tell which session resolved it. Looking at a session log, you couldn't tell which TODOs it advanced. Audit on R.AlphA.IDE (44 open TODOs, ~3 already resolved in code but never closed) made the cost concrete.

## Solution

Three optional L1 fields, no breaking changes:

| Field | Doc kind | Role |
|-------|----------|------|
| `entry_log` | TODO | Log/ref that motivated this TODO. Filled at creation if context exists |
| `exit_log` | TODO | Log path **or** free-text session reference. Filled at closing |
| `targets_todos` | Log | TODOs this session worked on |

Free-text exit_log values (`2026-04-27 session — handled inline`) are accepted — not every closure deserves a dedicated log.

## Behavior changes

- `lib/templates.js` + `templates/todo.md` + `templates/log.md`: new fields in template
- `lib/search.js` `parseL1()`: parses the 3 new fields, strips inline HTML comments
- `lib/status.js`: new section flagging `Done` TODOs without `exit_log`
- `commands/oc-todo.md` + `skills/oc-todo/SKILL.md`: agent guidance on filling entry_log
- `commands/oc-checkout.md`: new Phase 3bis (TODO sweep) — list open TODOs, ask user, write exit_log + targets_todos two-way
- `doc/ref/FORMAT.md`: documented the new fields, bumped doc_version 1.1.0 → 1.2.0

---

# Details

## Decisions

- **Optional, not strict**: forcing entry_log at creation would break cold-idea TODOs. `status` warns instead of blocking.
- **exit_log is free-form**: a path is best, but a short session reference is enough when the work was incidental. Avoids forcing a dedicated log for trivial closures.
- **Two-way link**: when checkout closes a TODO, it appends the TODO path to the log's `targets_todos` AND writes the log path to the TODO's `exit_log`. Symmetry matters — either direction must lead to the other.

## Test in isolation

`/tmp/oc-todo-test/` with two TODOs status=Done (one with exit_log, one without). `openclew status` correctly flagged only the missing one:

```
Done TODOs missing exit_log (1):
  - doc/todo/2026-04-26_done-without-exit.md  (A done todo without exit_log)
```

## Open items

- Rust port: not updated (status command not yet ported anyway)
- No automated migration of existing TODOs — fields are simply absent (treated as optional)
- `oc-checkout` Phase TODO is documented in the slash command but the auto-detection (grep TODO subject keywords against git diff) is left to the agent's discretion
