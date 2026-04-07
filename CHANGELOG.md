# Changelog

All notable changes to openclew are documented here.

## [Unreleased] — towards 0.7.0

### Added
- **`migrate` command in CLI** — `openclew migrate` available from the dispatcher (`help --all`)
- **`migrate` included in npm** — no longer excluded from published package
- **Doc-first instruction** — injected block now ends with "IMPORTANT — Start of every conversation" for stronger agent compliance
- **MCP-first commands** — injected block recommends `list_docs`/`read_doc` MCP tools, CLI as fallback
- **Coexistence detection** — `openclew status` warns if multiple binaries are in PATH
- **Version tag** — `openclew --version` shows `(node)` to distinguish from Rust binary
- **Rust port** — `openclew/rust/` with init, index, mcp (3 commands). 2.1 MB binary, 14 tests
- **MCP create tools** — Rust MCP server adds `create_log` and `create_ref`

### Changed
- **`migrate` outputs `clw_ref@`/`clw_log@`** — was `openclew@`. Semi-legacy `openclew@` docs get prefix swap only
- **UPGRADING.md rewritten** — current format targets, FR→EN status/type mapping tables, Node.js vs Rust section, version-specific notes for 0.7.0
- **Injected block restructured** — doc types, rules, commands sections; `doc/ref/*.md` path added; legacy `<!-- L1_START -->` markers removed
- **`clw_ref@`/`clw_log@` prefixes** — categorical prefix encodes doc type (replaces `openclew@`)
- **Pure Markdown L1** — list items replace div wrappers and comment markers
- **L2/L3 headers** — `# Summary` and `# Details` (no `L2 -`/`L3 -` prefix)
- **`doc/ref/` naming** — refdocs move from `doc/_*.md` to `doc/ref/SUBJECT.md` (convention, not enforced)

### Fixed
- **Parser recognizes `clw_ref@`/`clw_log@`** as current format (was only `openclew@`)
- **Rust parser accepts 3 prefixes** — `openclew@`, `clw_ref@`, `clw_log@`

## [0.6.0] — 2026-04-01

### Added
- Pure Markdown L1 format (positional parser `findL1Block()`)
- Update notifier — checks npm 1x/day, banner after commands
- "Try it now" post-init message with example log
- 54 automated tests (`npm test` via `node:test`)

### Changed
- L1 block: div wrappers → plain Markdown list items
- L2/L3 headers: `# Summary` / `# Details`
- Refdoc-first rule in injected block

## [0.5.2] — 2026-03-25

### Added
- User-level Copilot prompts (macOS/Windows/Linux profile paths)

## [0.5.1] — 2026-03-24

### Added
- Copilot prompt files in `.github/prompts/`
- `openclew --version` flag
- `init` updates existing openclew block on re-run

## [0.5.0] — 2026-03-23

### Added
- `openclew peek` command
- Init guard (requires project directory)
- Global config `~/.openclew/config.json`
- `scripts/qa.py` QA checklist

### Changed
- License: MIT → Apache 2.0

## [0.4.0] — 2026-03-20

### Added
- `openclew migrate` command (format conversion, dry-run by default)
- `openclew migrate --repoint` for updating `related_docs` paths

### Changed
- Format: YAML frontmatter → condensed line 1
- L1: plain `key: value` → `**key:** value` (bold syntax)
- Headers: emoji French → clean English

## [0.3.0] — 2026-03-19

### Added
- `openclew search` — keyword search with weighted scoring
- `openclew status` — documentation health dashboard
- `openclew mcp` — MCP server (stdio JSON-RPC)
- Skills for OpenClaw (`oc-init`, `oc-search`, `oc-checkpoint`)
- Published to npm as `openclew@0.3.0`

### Changed
- Zero Python — index generator rewritten in JS
- Templates: onboarding-ready with framework integration guide

## [0.2.0] — 2026-03-17

### Added
- Full CLI: init, add ref/log, checkout
- Entry point detection (AGENTS.md, CLAUDE.md, .cursorrules, etc.)
- Block injection with `<!-- openclew_START/END -->` markers
- Example projects

## [0.1.0] — 2026-03-15

### Added
- Initial repo — FORMAT.md, templates (refdoc, log), README
