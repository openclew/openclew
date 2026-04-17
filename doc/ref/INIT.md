clw_ref@0.9.1 · created: 2026-04-17 · updated: 2026-04-17 · type: Reference · status: Active · category: CLI · keywords: [init, setup, flags, gitignore, logs]

- **subject:** `openclew init` — setup flow, flags, and conventions (shared logs by default)
- **doc_brief:** Reference for `openclew init`: what it creates, flags (`--hook`, `--no-inject`, `--private-logs`), and why logs are versioned by default. Explains the 2026-04-17 behavior change (stopped adding `doc/log/` to `.gitignore`) and the opt-in for public repos.

---

# Summary

## Objective
Document the contract of `openclew init` so users (and agents) know exactly what the command touches, what's opt-in, and why logs are a **shared knowledge layer** rather than a private notebook.

## Key points
- `init` is idempotent: re-running it never loses data, it only fills gaps.
- `init` does **not** gitignore `doc/log/` anymore. Logs are committed by default — that's what makes them useful across sessions and agents.
- `--private-logs` flag restores the old behavior for public repos where personal/WIP notes should stay local.
- Both the Node CLI (`lib/init.js`) and the Rust port (`rust/src/cmd/init.rs`) honor the same flags.

---

# Details

## What `init` creates

| Path | Purpose | Always? |
|------|---------|---------|
| `~/.openclew/config.json` | Global config (version, install date) | Yes |
| `~/.claude/commands/oc-*.md` | User-level Claude Code slash commands | Yes |
| `.github/prompts/oc-*.prompt.md` | Project-level Copilot prompts | If in a project |
| `doc/ref/` | Refdocs dir | If in a project |
| `doc/log/` | Logs dir | If in a project |
| `doc/todo/` | TODO docs dir (one task per file) | If in a project |
| `doc/ref/USING_OPENCLEW.md` | Onboarding guide | If in a project |
| `doc/ref/ARCHITECTURE.md` | Seed architecture ref | If in a project |
| `doc/log/YYYY-MM-DD_setup-openclew.md` | Example log | If in a project |
| `doc/_INDEX.md` | Auto-generated index | If in a project |
| Entry point (`AGENTS.md` etc.) | Injected openclew block | If in a project (unless `--no-inject`) |
| `.openclew.json` | Project config (entry point pointer) | If in a project |
| `.vscode/openclew-preview.css` + `settings.json` | Markdown preview styling | If in a project |
| `TODO.md` | Seed TODO file | If in a project |
| `.git/hooks/pre-commit` | Index auto-regen hook | Only with `--hook` |
| `.gitignore` (adds `doc/log/`) | Gitignore logs | Only with `--private-logs` |

## Flags

| Flag | Effect |
|------|--------|
| `--hook` | Install the pre-commit hook that regenerates `doc/_INDEX.md` on every commit |
| `--no-inject` | Skip injection of the openclew block into the entry point file |
| `--private-logs` | Append `doc/log/` to `.gitignore` (opt-in — for public repos where session logs should stay local) |

## Why logs are versioned by default

openclew's promise is **long-life memory for LLMs**. Logs are immutable frozen facts from past sessions. Their value comes from being **readable by the next agent, on any machine, from a fresh clone**. If logs are gitignored, the memory doesn't survive a `git clone` — which defeats the tool.

The `--private-logs` flag exists for one case: an open-source repo where the maintainer doesn't want personal development notes published alongside the code. In that scenario, logs stay local and serve as a private notebook.

## Migration from earlier versions

Projects initialized before 2026-04-17 may have `doc/log/` in their `.gitignore` (added automatically by `init` at the time). To adopt the new default:

1. Remove the `doc/log/` line from `.gitignore`.
2. `git add doc/log/` to start tracking existing logs.
3. Commit.

Nothing is done automatically — the decision is project-specific.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | Initial creation — documents flags and the `--private-logs` opt-in behavior change |
| 2026-04-17 | Added `doc/todo/` to the list of directories created by `init` (paired with `/oc-todo` skill) |
