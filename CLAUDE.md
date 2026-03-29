# openclew - Instructions projet

## Contexte

Package npm CLI — Long Life Memory for LLMs. Documentation structurée L1/L2/L3 pour projets, lisible par humains et agents IA.
Stack : Node.js (CLI), Markdown (templates). Zero dépendances — ni npm, ni Python.

**Nom** : jeu de mots entre **open** (open-source), **OpenClaw** (agent IA autonome viral de Peter Steinberger, 247K stars GitHub — ex-Clawdbot/Moltbot, renommé après plainte trademark Anthropic) et **clew** (fil d'Ariane). OpenClaw = la hype agent IA du moment ; openclew = le fil conducteur qui structure la mémoire projet pour ces agents.

**Version actuelle** : voir `package.json` → `version`

**Documentation** : `doc/` généré par `openclew init` (dogfooding). Logs et refdocs internes vivent aussi dans `R.AlphA.Doc/doc/` (logs openclew préfixés `openclew-*`).

## Commandes

```bash
node bin/openclew.js help              # Usage CLI
node bin/openclew.js help --all        # Usage CLI + commandes avancées
node bin/openclew.js init              # Test init dans un projet
node bin/openclew.js add ref "Title"   # Test création refdoc
node bin/openclew.js add log "Title"   # Test création log
node bin/openclew.js search "auth"     # Test recherche docs
node bin/openclew.js checkout          # Test résumé fin de session
python3 scripts/qa.py                  # Checklist QA box-drawing (SSOT: R.AlphA.Doc)
npm publish                            # Publier sur npm
```

Pas de build — JavaScript exécuté directement.

## Règles projet

### Préfixe version

| Préfixe | Composant | Source de vérité |
|---------|-----------|------------------|
| `oc_` | CLI npm openclew | `package.json` → `version` |

### Architecture

```
npx openclew <command>
    ↓
bin/openclew.js (dispatcher)
    ↓
lib/*.js (init, new-doc, new-log, search, status, mcp-server, index-gen, detect, inject, config, templates)
```

### Conventions

- Zero dépendances — Node 16+ uniquement (plus de Python requis depuis oc_0.3.0)
- Idempotence stricte : chaque commande ré-exécutable sans effet de bord
- **Entry point** : un seul fichier d'instruction est le point d'entrée openclew, stocké dans `.openclew.json`. Par défaut AGENTS.md (case-insensitive). Si absent, l'utilisateur choisit parmi les instruction files détectés ou un AGENTS.md est créé
- Détection instruction files : CLAUDE.md, .cursorrules, .cursor/rules, .github/copilot-instructions.md, .windsurfrules, .windsurf/rules, .clinerules, AGENTS.md (case-insensitive), .antigravity/rules.md, .gemini/GEMINI.md, CONVENTIONS.md
- `init` crée toujours : guide (`_USING_OPENCLEW.md`), exemple refdoc (`_ARCHITECTURE.md`), exemple log, index. Pas de flag `--demo`
- Injection via markers `<!-- openclew_START -->` / `<!-- openclew_END -->`
- Templates embarqués dans `lib/templates.js` (standalone) + fichiers dans `templates/` (référence)
- **Format doc** : ligne 1 = métadonnées condensées (`openclew@VERSION · date · type · status · category · keywords`), L1 = `**subject:**` + `**doc_brief:**` entre markers L1_START/L1_END
- **Parser rétrocompatible** : supporte l'ancien format (key:value dans L1) en fallback

### Intégration R.AlphA.IDE

openclew est le **knowledge layer** qu'AlphABot (extension VS Code R.AlphA.IDE) utilise pour naviguer la documentation projet de manière token-efficiente. L'extension doit :
- Utiliser `openclew peek` ou `collectDocs()` au démarrage de session pour cartographier le knowledge disponible
- Utiliser la navigation L1 → L2 → L3 pour minimiser la consommation de tokens
- Proposer des réponses contextualisées par les docs pertinentes du projet

Ref cross-projet : `R.AlphA.IDE/CLAUDE.md` § Intégration openclew

### Lien avec R.AlphA.PF (onboarding)

L'onboarding AlphABot (R.AlphA.PF) et openclew partagent le même objectif : structurer le knowledge projet pour qu'un agent IA s'y retrouve dès la première session. Liens concrets :
- PF `_ONBOARDING_DESIGN.md` TODO découverte #3 : "Structurer un premier projet — `doc/`, `doc/log/`, OpenClew"
- PF TODO : "Intégration OpenClew dans le prompt" (`_base.md` → section L1/L2/L3)
- Le flow OpenClaw (AGENTS.md comme entry point) inspire directement le entry point par défaut d'openclew

## QA — Tests en isolation

**Critique.** Avant toute release, vérifier la grille QA. Projet test : `/tmp/openclew-test/` (recréé à la demande).

| Doc | Contenu |
|-----|---------|
| `R.AlphA.Doc/doc/_OPENCLEW_ONBOARDING_TEST.md` | **Grille QA principale** — checklist 4 colonnes (Impl/Raphaël/Victor/Autres), scénarios agents |
| `R.AlphA.Doc/doc/_OPENCLEW_INSTALL_TEST_PROCEDURE.md` | Procédure pas-à-pas installation + test projet vierge |

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `bin/openclew.js` | Entry point CLI (dispatch commandes) |
| `lib/init.js` | Setup projet (dirs, entry point, inject, hook, index) |
| `lib/detect.js` | Détection instruction files (case-insensitive AGENTS.md) |
| `lib/inject.js` | Injection bloc openclew dans le entry point |
| `lib/config.js` | Lecture/écriture `.openclew.json` (entryPoint) |
| `lib/templates.js` | Templates embarqués + helpers (slugify, today, ocVersion) |
| `lib/new-doc.js` | Création refdoc `_TITLE.md` |
| `lib/new-log.js` | Création log `YYYY-MM-DD_title.md` |
| `lib/search.js` | Recherche keyword dans L1/metadata + parsers JS + `collectDocs()`/`walkDir()` (SSOT scan récursif, réutilisés par index-gen, MCP, migrate, peek, status) |
| `lib/status.js` | Dashboard santé docs (stats, missing brief, stale) |
| `lib/mcp-server.js` | MCP server stdio — search_docs, read_doc, list_docs |
| `lib/index-gen.js` | Génération `_INDEX.md` en JS natif (réutilise parsers de search.js) |
| `lib/migrate.js` | Migration legacy → format openclew + `--repoint` pour related_docs |
| `UPGRADING.md` | Guide upgrade user-facing (version notes, étapes, limitations) |
| `templates/refdoc.md` | Template référence refdoc |
| `templates/log.md` | Template référence log |
| `commands/oc-*.md` | Slash commands Claude Code (installées par `init`) |
| `skills/oc-*/` | Skills OpenClaw (SKILL.md) pour onboarding agents |
| `examples/` | Exemples simple-project et with-claudemd |

## Pièges connus

| Piège | Solution |
|-------|----------|
| Hook pre-commit des anciennes versions appelle Python | `init` nettoie automatiquement `doc/generate-index.py` legacy |
| npm publish demande 2 auth (login + OTP 2FA) | Utiliser `rocpublish` (alias zsh = cd + login + publish). Toujours 2 validations navigateur, c'est normal côté npm |

## TODO

### Tier 1 — Urgent
- [x] **Éliminer la dépendance à `_INDEX.md`** : Bloc injecté → `peek`/`search` (scan dynamique). Hook pre-commit opt-in (`--hook`). `_INDEX.md` reste disponible via `openclew index` comme cache humain-friendly (2026-03-29)
- [x] **Scan recursif `doc/`** : `collectDocs()` + `walkDir()` dans search.js scannent récursivement. `doc/ref/_*.md` etc. sont trouvés. `migrate.js` utilise `walkDir()` via import (SSOT) (2026-03-29)
- [x] **CLI migrate : repointing `related_docs`** : `openclew migrate --repoint <old> <new> [--write]`. Scanne tous les docs, remplace les chemins (2026-03-29)
- [x] **CLI search** : `openclew search <query>` — recherche keyword L1/metadata, scoring pondéré (2026-03-19)
- [x] **MCP server** : `openclew mcp` — stdio JSON-RPC, 3 tools: search_docs, read_doc, list_docs (2026-03-19)

### Tier 2 — Court terme
- [ ] **Notification update** : À chaque commande, checker si une version plus récente existe sur npm (max 1x/jour, async, cache dans `~/.openclew/config.json`). Afficher un bandeau clair en fin de commande avec `npx openclew@latest init`. L'utilisateur ne doit pas avoir à chercher comment mettre à jour.
- [ ] **Init sans friction** : Chaque projet nécessite `openclew init`. Pas de mécanisme "global instruction" universel (chaque agent a sa propre config). Le dénominateur commun = fichier d'instruction per-projet (AGENTS.md, CLAUDE.md, .cursorrules...), c'est ce qu'openclew fait déjà. **Pistes explorées et rejetées** : (1) global `~/.openclew/INSTRUCTIONS.md` injecté dans config agent → marche pour Claude Code, pas pour les autres, (2) MCP global → donne les tools mais pas l'instruction de les utiliser. **Décision : résoudre d'abord pour AlphABot** (fichier d'instructions à la racine comme CLAUDE.md), puis voir pour les autres éditeurs. Le per-projet reste la seule approche universelle.
- [ ] **Améliorer CSS preview markdown** : Le CSS `.vscode/openclew-preview.css` injecté par `init` est un premier jet. Headers toujours trop gros, espacement à affiner, metadata ligne 1 à mieux styler. Itérer sur le rendu VS Code avec des vrais docs.
- [ ] **Verbosité configurable** : Niveau concis/normal/détaillé. Stocké dans `.openclew.json`, injecté dans le bloc AGENTS.md. **Onboarding** : proposer spontanément dès la première session de régler la verbosité, avec une forte incitation vers "concis" (ex: "Most developers prefer concise — try it first"). Beaucoup d'utilisateurs se font spammer sans savoir que c'est configurable. Le défaut devrait être concis ou le choix forcé au setup.
- [ ] **CLI migrate** : `openclew migrate` — upgrade legacy docs vers format openclew (line 1 condensee, L1 bold). Dry-run par defaut, `--write` pour appliquer. Code pret (`lib/migrate.js`), non publie. Ref : `R.AlphA.Doc/doc/log/2026-03-24_openclew-migrate-command.md`
- [ ] **Auto-génération L1** : Option `--auto` sur `new`/`log` — appel LLM pour pré-remplir `doc_brief` + `subject` depuis contenu L3
- [x] **CLI status** : `openclew status` — dashboard santé (stats, missing brief, stale, distribution) (2026-03-19)
- [ ] **Tests automatisés** : Ajouter tests unitaires CLI + index generator

### Tier 3 — Moyen terme
- [ ] **Session memory** : Extraction auto des faits importants en fin de session
- [ ] **Semantic search** : Embeddings locaux optionnels (pas de serveur)
- [ ] **Intégration AlphABot** : Implémenter la lecture L1/L2/L3 côté extension VS Code (R.AlphA.IDE)

### Backlog
- [ ] **Dogfooding** : Utiliser openclew dans openclew lui-même (`doc/` avec L1/L2/L3)
- [ ] **Propagation doc_brief** : Propager doc_brief → doc_brief dans R.AlphA.Doc (templates, hooks, conventions globales)
- [x] **npm publish** : Publié oc_0.3.0 — logo v1, author/homepage/bugs, migrate exclu, fix README (2026-03-25)
- [x] **Zero Python** : Index generator réécrit en JS natif, réutilise parsers de search.js. `hooks/generate-index.py` supprimé (2026-03-24)
- [x] **Skills OpenClaw** : 3 skills renommés `oc-init`, `oc-search`, `oc-checkpoint` (2026-03-27, ex-`openclew-*`)
- [x] **Slash commands Claude Code** : 4 commands `oc-checkout`, `oc-search`, `oc-init`, `oc-status` installées par `init` dans `~/.claude/commands/` (2026-03-27)
- [x] **Coexistence OpenClaw** : Section ajoutée dans template `_USING_OPENCLEW.md` expliquant la complémentarité (2026-03-24)
