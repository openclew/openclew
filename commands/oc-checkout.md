<!-- openclew-managed -->
# oc-checkout — End-of-session summary

Generates a structured summary of the session and persists it as a log.

**Usage:** `/oc-checkout` (no arguments, uses the current project)

## Key principle

**Commits happen AFTER the checkout**, never during. This allows including logs created during checkout in the same commit.

## Status emojis

| Emoji | Column | Meaning |
|-------|--------|---------|
| ✅    | Status | Done |
| 🚧    | Status | In progress / partial |
| ❌    | Status | Not done |
| 📗    | Doc    | Ref written (`doc/ref/*.md` or legacy `doc/_*.md`) |
| 📕    | Doc    | No ref |
| 🟢    | Commit | Already committed |
| 🟡    | Commit | To be committed |

**Strict Doc column rule**: 📗 = only a **ref** written to disk under `doc/ref/*.md` (or legacy `doc/_*.md`). Code files (`.py`, `.ts`, `.sh`, ...), logs (`doc/log/*.md`), `CLAUDE.md`, and `TODO.md` do NOT count as 📗. If the action produces no ref, Doc stays 📕 and the File column points to whatever was actually modified.

## Sequence

### Phase 1: Collection (silent)

Execute silently — go straight to the Phase 2 table:
1. Run `npx openclew checkout` to collect git activity and display the CLI summary
2. List session actions (features, bugs, refactors...)
3. Check which files are documented (`doc/log/*.md`, `doc/_*.md`)
4. Check git status of each file (committed or not)

### Phase 2: Summary table

Display the recap table for validation.

**Format:**
- Box-drawing (no Markdown pipes)
- **Isolated emojis** in dedicated mini-columns (never emoji + text in the same cell)
- Emoji columns: **5 chars wide** (`─────`) with **2 spaces after emoji** (`│ ✅  │`)
- Action column: **max 50 chars** (rephrase/abbreviate if needed, never truncate)
- No separator `├───┤` between data rows, only after the header

**Example:**
```
┌─────┬──────────────────────────────────────┬─────┬────────────────────────┬─────┐
│ Sta │ Action                               │ Doc │ File                   │Comm.│
├─────┼──────────────────────────────────────┼─────┼────────────────────────┼─────┤
│ ✅  │ Feature: Auth middleware refactor    │ 📗  │ 2026-01-15_auth.md     │ 🟢  │
│ 🚧  │ Fix: Table alignment                │ 📕  │ Not documented         │ 🟡  │
└─────┴──────────────────────────────────────┴─────┴────────────────────────┴─────┘
```

### Phase 3: Refs to update?

1. List refs: all `doc/_*.md` files (including subdirectories) + project instruction file (CLAUDE.md, AGENTS.md, etc.)
2. Filter those related to session actions (by name only — don't read yet)
3. For each related doc: read and assign status:
   - ☑️ No update needed (verified, up to date)
   - ✅ Already updated during session
   - 📒 Needs update (proposed in Phase 4)
4. **Instruction file**: always evaluated. Flag 📒 if:
   - New ref created during session (needs reference)
   - Useful info discovered (pitfall, convention, command)
   - Stale context (abandoned topic, modified rule)
   - File missing (needs creation)
5. Display all related docs with status:

```
📚 Refs:
   ✅ _AUTH_DESIGN.md       — updated (session section)
   ☑️ _ARCHITECTURE.md      — verified, up to date
   📒 _INSTALL_GUIDE.md     — new deploy step to document
   📒 CLAUDE.md             — new pitfall discovered
```

### Phase 3bis: TODO sweep

1. List `doc/todo/*.md` with `status: Open` or `In progress`
2. For each, ask the user one of:
   - `Done` (resolved this session) → write `exit_log:` with this session's log path or a short session reference, set `status: Done`
   - `In progress` (advanced but not closed) → leave open, optionally update doc_brief
   - `Unchanged` → leave as-is
3. Bonus auto-detection: grep TODO subject keywords against the session's git diff. Surface suggestions, don't auto-close.
4. For TODOs marked `Done`, also append the TODO path to the log's L1 `targets_todos:` field. Two-way link.

`exit_log` accepts a dedicated log path (`doc/log/2026-04-26_foo.md`) **or** a free-text session reference (`2026-04-26 session — handled inline`). Don't force a dedicated log if the work was incidental.

### Phase 4: Proposed actions (grouped)

Display all actions together:

```
─── Proposed actions ───

1. [ ] Create log for "Fix: Description" → `2026-01-15_topic.md`
2. [ ] Update CLAUDE.md (modified context)

Approve actions? (yes/no/modify)
```

- Wait for user validation
- If "modify": user indicates changes, adapt, re-validate
- Execute validated actions (create logs, updates)

### Phase 5: Commits (AFTER everything else)

Execute directly after action validation:

1. Check `git status` for all files to commit
2. Execute commit(s)
3. Logs created in Phase 4 are included
4. Display result

## Closing message

**Mandatory at the end of checkout.** Displayed after commits.

```
─── Summary ───
1. Concrete fact #1 (short sentence)
2. Concrete fact #2

✅📗🟢  Feature: Description              →  file.md
🚧📕🟡  Fix: Description                  →  (not documented)

─── How to test ───
• manual action or command → expected result

─── Next steps ───
⏭️📗 Test the new feature              →  CLAUDE.md TODO
⏭️📕 Explore WebSocket option

═══════════════════════════════════════
🏁 Session complete
```

**Compact format — 3 emojis concatenated:**
- Position 1: status (✅ done / 🚧 in progress / ❌ not done)
- Position 2: documentation (📗 yes / 📕 no)
- Position 3: commit (🟢 yes / 🟡 no)

**Closing rule:**
- `🏁 Session complete`: only if all actions are ✅📗🟢
- Otherwise: `⏸️ Session incomplete` and list what remains
