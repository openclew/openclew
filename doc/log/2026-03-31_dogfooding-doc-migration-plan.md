openclew@0.6.0 · date: 2026-03-31 · type: Process · status: In progress · category: Dogfooding · keywords: [dogfooding, migration, logs, i18n, process]

- **subject:** Dogfooding plan — migrate openclew's own docs into openclew format
- **doc_brief:** Plan to make openclew document itself: un-gitignore doc/log/, translate 21 French logs from external repo, remove internal references, establish dogfooding as standard workflow.

---

# Summary

## Objective
openclew should use its own documentation system. Currently, openclew's development logs live in an external repository (in French), and `doc/log/` is gitignored. This defeats the purpose of the tool.

## Problem
- `doc/log/` is in `.gitignore` — logs are not tracked in the repo
- 20 development logs live in an external repo, written in French
- 1 local log (`2026-03-29_tier1-recursive-scan-index-independence.md`) is also in French
- External contributors cannot access project history
- openclew doesn't eat its own dogfood

## Plan
1. **Remove `doc/log/` from `.gitignore`** — logs must be version-controlled
2. **Translate 21 logs to English** — copy from external repo, translate, remove any internal references to make them standalone
3. **Translate existing local log** (`2026-03-29`) to English
4. **Establish dogfooding process** — every openclew session uses `openclew add log` to document work
5. **Entry point** — `AGENTS.md` is the tool-agnostic entry point (already in place). `CLAUDE.md` stays gitignored (private/internal)

## Logs to migrate
| Date | Slug | Topic |
|------|------|-------|
| 2026-03-07 | openclew-naming | Naming decision (open + OpenClaw + clew) |
| 2026-03-08 | openclew-cli-d1v | First CLI version |
| 2026-03-08 | openclew-publish-ready | Publish readiness check |
| 2026-03-15 | openclew-cli-v2 | CLI v2 rewrite |
| 2026-03-17 | openclew-nettoyage-git-publication | Git cleanup for publication |
| 2026-03-17 | test-new-user-openclew | New user onboarding test |
| 2026-03-18 | openclew-format-l1-doc-brief | L1 format and doc_brief spec |
| 2026-03-19 | openclew-refdoc-autoload-publish | Refdoc autoload + publish |
| 2026-03-19 | openclew-rename-living-refdoc | Rename living refdoc convention |
| 2026-03-19 | openclew-search-mcp-status | Search, MCP server, status commands |
| 2026-03-20 | unify-format-openclew | Unified doc format |
| 2026-03-21 | openclew-cli-ux-add-ref-log | CLI UX for add ref/log |
| 2026-03-21 | openclew-onboarding-copilot-test | Copilot onboarding test |
| 2026-03-22 | openclew-bloc-inject-v4 | Injection block v4 |
| 2026-03-24 | openclew-migrate-command | Migrate command implementation |
| 2026-03-24 | openclew-openclaw-compatibility | OpenClaw compatibility |
| 2026-03-25 | openclew-publish-oc-0.3.0 | oc_0.3.0 npm publish |
| 2026-03-27 | bridge-openclew-slash-commands | Slash commands bridge |
| 2026-03-28 | openclew-copilot-test | Copilot agent test |
| 2026-03-29 | openclew-qa-releases-0.5.x | QA and 0.5.x releases |
| 2026-03-29 | tier1-recursive-scan-index-independence | Recursive scan + index independence (local, needs translation) |

---

# Details

## Decision: copy, not move
Logs are copied from the external repo and translated. Originals stay in place (they may be referenced by other internal docs).

## Decision: translate all 21
Even early logs (naming, cli-d1v) are valuable project history for external contributors.

## Gitignore change
```diff
- doc/log/
```
Only `doc/log/` needs to be removed. `CLAUDE.md` stays gitignored.

## Dogfooding process (new standard)
- Every openclew work session: `openclew add log "topic"` at the start
- All content in English
- No references to internal/private projects
- Logs are committed with the code changes they document
