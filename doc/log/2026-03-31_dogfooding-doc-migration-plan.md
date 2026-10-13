openclew@0.6.0 · date: 2026-03-31 · type: Process · status: In progress · category: Dogfooding · keywords: [dogfooding, migration, logs, i18n, process]

- **subject:** Plan de dogfooding — migrer la doc d'openclew au format openclew
- **doc_brief:** Plan pour qu'openclew se documente lui-même : retirer doc/log/ du gitignore, traduire 21 logs français depuis un dépôt externe, supprimer les références internes, établir le dogfooding comme workflow standard.

---

# Summary

## Objectif
openclew doit utiliser son propre système de documentation. Actuellement, les logs de développement d'openclew vivent dans un dépôt externe (en français), et `doc/log/` est dans le gitignore. Cela va à l'encontre de la raison d'être de l'outil.

## Problème
- `doc/log/` est dans le `.gitignore` — les logs ne sont pas suivis dans le dépôt
- 20 logs de développement vivent dans un dépôt externe, rédigés en français
- 1 log local (`2026-03-29_tier1-recursive-scan-index-independence.md`) est aussi en français
- Les contributeurs externes n'ont pas accès à l'historique du projet
- openclew ne mange pas sa propre cuisine

## Plan
1. **Retirer `doc/log/` du `.gitignore`** — les logs doivent être versionnés
2. **Traduire 21 logs en anglais** — copier depuis le dépôt externe, traduire, retirer toute référence interne pour les rendre autonomes
3. **Traduire le log local existant** (`2026-03-29`) en anglais
4. **Établir le processus de dogfooding** — chaque session openclew utilise `openclew add log` pour documenter le travail
5. **Point d'entrée** — `AGENTS.md` est le point d'entrée agnostique de l'outil (déjà en place). `CLAUDE.md` reste dans le gitignore (privé/interne)

## Logs à migrer
| Date | Slug | Sujet |
|------|------|-------|
| 2026-03-07 | openclew-naming | Décision de nom (open + OpenClaw + clew) |
| 2026-03-08 | openclew-cli-d1v | Première version du CLI |
| 2026-03-08 | openclew-publish-ready | Vérification de préparation à la publication |
| 2026-03-15 | openclew-cli-v2 | Réécriture CLI v2 |
| 2026-03-17 | openclew-nettoyage-git-publication | Nettoyage git pour la publication |
| 2026-03-17 | test-new-user-openclew | Test d'onboarding nouvel utilisateur |
| 2026-03-18 | openclew-format-l1-doc-brief | Spécification du format L1 et du doc_brief |
| 2026-03-19 | openclew-refdoc-autoload-publish | Autoload des refdocs + publication |
| 2026-03-19 | openclew-rename-living-refdoc | Renommage de la convention living refdoc |
| 2026-03-19 | openclew-search-mcp-status | Commandes search, serveur MCP, status |
| 2026-03-20 | unify-format-openclew | Format de doc unifié |
| 2026-03-21 | openclew-cli-ux-add-ref-log | UX du CLI pour add ref/log |
| 2026-03-21 | openclew-onboarding-copilot-test | Test d'onboarding Copilot |
| 2026-03-22 | openclew-bloc-inject-v4 | Bloc d'injection v4 |
| 2026-03-24 | openclew-migrate-command | Implémentation de la commande migrate |
| 2026-03-24 | openclew-openclaw-compatibility | Compatibilité OpenClaw |
| 2026-03-25 | openclew-publish-oc-0.3.0 | Publication npm oc_0.3.0 |
| 2026-03-27 | bridge-openclew-slash-commands | Pont des slash commands |
| 2026-03-28 | openclew-copilot-test | Test de l'agent Copilot |
| 2026-03-29 | openclew-qa-releases-0.5.x | QA et releases 0.5.x |
| 2026-03-29 | tier1-recursive-scan-index-independence | Scan récursif + indépendance de l'index (local, à traduire) |

---

# Details

## Décision : copier, pas déplacer
Les logs sont copiés depuis le dépôt externe et traduits. Les originaux restent en place (ils peuvent être référencés par d'autres docs internes).

## Décision : traduire les 21
Même les premiers logs (naming, cli-d1v) constituent un historique de projet précieux pour les contributeurs externes.

## Changement du gitignore
```diff
- doc/log/
```
Seul `doc/log/` doit être retiré. `CLAUDE.md` reste dans le gitignore.

## Processus de dogfooding (nouveau standard)
- Chaque session de travail sur openclew : `openclew add log "topic"` au démarrage
- Tout le contenu en anglais
- Aucune référence à des projets internes/privés
- Les logs sont commités avec les changements de code qu'ils documentent
