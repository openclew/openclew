openclew@0.5.3 · date: 2026-03-29 · type: Feature · status: Done · category: Core · keywords: [recursive, scan, collectDocs, walkDir, index, repoint, related_docs]

<!-- L1_START -->
**subject:** Tier 1 — scan récursif, indépendance _INDEX.md, repointing related_docs

**doc_brief:** collectDocs() et walkDir() scannent doc/ récursivement. Le bloc injecté et le guide orientent les agents vers peek/search au lieu de _INDEX.md. Hook pre-commit opt-in. migrate --repoint met à jour les chemins related_docs.
<!-- L1_END -->

---

<!-- L2_START -->
# L2 - Summary

## Objective
Résoudre les 3 items Tier 1 du TODO openclew : scan récursif, élimination de la dépendance à _INDEX.md, repointing related_docs.

## Problem
- `collectDocs()` ne scannait que `doc/_*.md` en flat — un `doc/ref/` était invisible
- Le bloc injecté dans les instruction files disait "Read `doc/_INDEX.md`" — dépendance à un fichier statique qui se désynchronise
- Aucun outil pour mettre à jour les `related_docs` quand un fichier est déplacé

## Solution
1. **Scan récursif** : `walkDir()` + `collectDocs()` dans search.js. Refdocs = `_*.md` récursif (hors log/, notes/, verify_logs/). Logs = `*.md` récursif sous log/. migrate.js importé `walkDir()` (SSOT).
2. **Indépendance _INDEX.md** : Bloc injecté (inject.js) → "Run `npx openclew peek`". Guide (_USING_OPENCLEW.md template) → peek/search. Hook pre-commit inversé : opt-in via `--hook`. _INDEX.md reste générable manuellement (`openclew index`).
3. **Repointing** : `migrate --repoint <old> <new> [--write]` scanne tous les docs et remplace les chemins.

## Session

📅 2026-03-29 🏷️  Tier 1 — scan récursif, index indep -----  #recursive #collectDocs #walkDir #index #repoint #inject #migrate

1. collectDocs() scannait doc/ en flat — les sous-dossiers étaient invisibles
2. Les agents dépendaient de _INDEX.md statique — remplacé par peek/search dynamique
3. migrate --repoint ajouté pour mettre à jour related_docs après déplacement

17 tests manuels passés (scan, exclusions, peek, search, status, index, MCP, init, repoint).

Suivi dans la même session :
- ✅ Nettoyé 17 mentions _INDEX.md dans 8 fichiers (README, UPGRADING, commands, skills, templates)
- ✅ Fixé bug `openclew index` dispatcher (process.argv[2] = "index" au lieu du path)
- ✅ MAJ UPGRADING.md : limitations flat-only et repoint supprimées (maintenant résolues)
<!-- L2_END -->

---

<!-- L3_START -->
# L3 - Details

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `lib/search.js` | Ajout `walkDir()`, `collectDocs()` récursif, export walkDir |
| `lib/migrate.js` | Import walkDir, collectFiles() utilise walkDir, ajout repointRelatedDocs() + runRepoint() |
| `lib/inject.js` | Bloc injecté : peek au lieu de _INDEX.md, commandes `add ref`/`add log` |
| `lib/templates.js` | guideContent() : peek/search au lieu de _INDEX.md (5 mentions remplacées) |
| `lib/init.js` | Hook pre-commit opt-in (`--hook` au lieu de `--no-hook`) |
| `bin/openclew.js` | Help mis à jour (--hook) |
| `CLAUDE.md` | TODO T1 cochés, fichiers clés mis à jour, IDE section → peek |
| `lib/index-gen.js` | Fix bug CLI runner : argv parsing corrigé (pattern search.js) |
| `README.md` | 5 mentions _INDEX.md → peek/search/optionnel |
| `UPGRADING.md` | Mention _INDEX.md + limitations flat/repoint supprimées |
| `commands/oc-init.md` | _INDEX.md → peek |
| `commands/oc-checkout.md` | Exclusion _INDEX.md → inclusion subdirs |
| `skills/oc-checkpoint/SKILL.md` | _INDEX.md → optionnel |
| `skills/oc-init/SKILL.md` | 2 mentions + --no-hook → --hook |
| `templates/onboarding/flow.md` | 5 mentions _INDEX.md → .openclew.json/peek |
| `templates/FORMAT.md` | _INDEX.md → cache optionnel |

## Constantes partagées (search.js)

- `SKIP_DIRS`: `_archive`, `old`, `.Rproj.user`
- `SKIP_FILES`: `_INDEX.md`, `_INDEX_NOTES.md`
- `REFDOC_EXTRA_SKIP`: `log`, `notes`, `verify_logs`

## Tests effectués

Tous dans `/tmp/oc-test-*`, projets jetables recréés à chaque run.

| # | Test | Commande / API | Résultat attendu | Résultat obtenu |
|---|------|----------------|------------------|-----------------|
| 1 | Scan récursif collectDocs | `collectDocs('/tmp/.../doc')` avec `doc/_ROOT.md`, `doc/ref/_NESTED.md`, `doc/log/test.md`, `doc/log/2026/nested.md` | 4 docs (2 refdocs, 2 logs) | 4 docs (2 refdocs, 2 logs) |
| 2 | migrate dry-run nested | `openclew migrate` avec legacy docs dans `doc/`, `doc/ref/`, `doc/log/` | 3 fichiers à migrer | 3 fichiers détectés |
| 3 | repoint dry-run | `migrate --repoint doc/_FOO.md doc/ref/_FOO.md` | Détecte les fichiers contenant l'ancien chemin | 3 fichiers détectés |
| 4 | repoint --write | `migrate --repoint ... --write` | `related_docs` mis à jour dans le fichier | `related_docs: [doc/ref/_FOO.md]` confirmé |
| 5 | MCP list_docs | JSON-RPC `tools/call` `list_docs` | Inclut `doc/ref/_NESTED_REF.md` | 5 docs listés, nested inclus avec `path: "doc/ref/_NESTED_REF.md"` |
| 6 | MCP search_docs | JSON-RPC `tools/call` `search_docs` query="nested" | Trouve le doc nested | 1 résultat, score 7.5 |
| 7 | init sans --hook | `openclew init --no-inject --no-commands` | Step 5 = "Skipping (use --hook...)" | Confirmé, pas de hook créé |
| 8 | init --hook | `openclew init --hook --no-inject --no-commands` | Hook pre-commit créé | `.git/hooks/pre-commit` créé avec `# openclew-index` |
| 9 | peek nested | `openclew peek` dans projet avec `doc/ref/_NESTED_REF.md` | Liste le doc nested | 4 refdocs listés dont `_NESTED_REF.md — Nested refdoc in ref/ [Active]` |
| 10 | search nested | `openclew search nested` | Trouve le doc | 1 résultat avec chemin `doc/ref/_NESTED_REF.md` |
| 11 | status nested | `openclew status` | Compte 5 docs (4 refdocs + 1 log) | `Refdocs: 4, Logs: 1, Total: 5, Health: 100%` |
| 12 | index API nested | `writeIndex('/tmp/.../doc')` | Inclut nested dans le tableau | `_NESTED_REF.md` avec path `doc/ref/_NESTED_REF.md` dans l'index |
| 13 | Exclusion _archive/ | `collectDocs()` avec `doc/_archive/_SKIP.md` | Pas listé comme refdoc | 0 refdoc depuis _archive/ |
| 14 | Exclusion old/ | `collectDocs()` avec `doc/old/_SKIP.md` | Pas listé comme refdoc | 0 refdoc depuis old/ |
| 15 | Exclusion notes/ | `collectDocs()` avec `doc/notes/_SKIP.md` | Pas listé comme refdoc | 0 refdoc depuis notes/ |
| 16 | log/ exclu des refdocs | `collectDocs()` avec `doc/log/_NOT_A_REFDOC.md` | Traité comme log, pas refdoc | `kind: "log"` confirmé |
| 17 | inject.js sans _INDEX.md | `grep _INDEX inject.js` | Aucune mention | 0 matches |
<!-- L3_END -->
