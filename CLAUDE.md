# openclew - Instructions projet

## Contexte

Package npm CLI — Long Life Memory for LLMs. Documentation structurée L1/L2/L3 pour projets, lisible par humains et agents IA.
Stack : Node.js (CLI), Markdown (templates). Zero dépendances — ni npm, ni Python.

**Nom** : jeu de mots entre **open** (open-source), **OpenClaw** (agent IA autonome viral de Peter Steinberger, 247K stars GitHub — ex-Clawdbot/Moltbot, renommé après plainte trademark Anthropic) et **clew** (fil d'Ariane). OpenClaw = la hype agent IA du moment ; openclew = le fil conducteur qui structure la mémoire projet pour ces agents.

**Version actuelle** : voir `package.json` → `version`

**Documentation** : `doc/` généré par `openclew init` (dogfooding). Logs et refs internes vivent aussi dans `R.AlphA.Doc/doc/` (logs openclew préfixés `openclew-*`).

## Règle de session

**Doc-first obligatoire** : En début de session, lancer `/oc-peek` (ou lire `doc/_INDEX.md`) pour cartographier les refs disponibles avant toute exploration de code.

## Commandes

```bash
node bin/openclew.js help              # Usage CLI
node bin/openclew.js help --all        # Usage CLI + commandes avancées
node bin/openclew.js init              # Test init dans un projet
node bin/openclew.js add ref "Title"   # Test création ref
node bin/openclew.js add log "Title"   # Test création log
node bin/openclew.js add todo "Title"  # Test création TODO (doc/todo/)
node bin/openclew.js search "auth"     # Test recherche docs
node bin/openclew.js checkout          # Test résumé fin de session
python3 scripts/qa.py                  # Checklist QA box-drawing (SSOT: R.AlphA.Doc)
npm publish                            # Publier sur npm
```

Pas de build — JavaScript exécuté directement.

## Règles projet

### Langue
- Tout le contenu du projet (code, docs, comments, L1/L2/L3, doc_brief) est en **anglais**. Ne jamais écrire en français même si la conversation l'est.

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

### Principe directeur : l'agent guide l'utilisateur

openclew doit être **proactif** : c'est l'agent (via le bloc injecté) qui suggère les actions — créer un doc, migrer un format, externaliser les TODO, configurer une option. L'utilisateur ne devrait jamais avoir à deviner quoi faire. Chaque fonctionnalité doit être auto-découvrable via les commandes, le bloc injecté, ou les messages de `status`.

### Conventions

- Zero dépendances — Node 16+ uniquement (plus de Python requis depuis oc_0.3.0)
- Idempotence stricte : chaque commande ré-exécutable sans effet de bord
- **Entry point** : un seul fichier d'instruction est le point d'entrée openclew, stocké dans `.openclew.json`. Par défaut AGENTS.md (case-insensitive). Si absent, l'utilisateur choisit parmi les instruction files détectés ou un AGENTS.md est créé
- Détection instruction files : CLAUDE.md, .cursorrules, .cursor/rules, .github/copilot-instructions.md, .windsurfrules, .windsurf/rules, .clinerules, AGENTS.md (case-insensitive), .antigravity/rules.md, .gemini/GEMINI.md, CONVENTIONS.md
- `init` crée toujours : guide (`ref/USING_OPENCLEW.md`), exemple ref (`ref/ARCHITECTURE.md`), exemple log, index. Pas de flag `--demo`
- Injection via markers `<!-- openclew_START -->` / `<!-- openclew_END -->`
- Templates embarqués dans `lib/templates.js` (standalone) + fichiers dans `templates/` (référence)
- **Format doc** : ligne 1 = métadonnées condensées (`clw_ref@VERSION` pour refs, `clw_log@VERSION` pour logs, suivi de ` · date · type · status · category · keywords`), L1 = `- **subject:**` + `- **doc_brief:**` (liste Markdown entre ligne 1 et premier `---`). SSOT : `templates/FORMAT.md`
- **Parser rétrocompatible** : `findL1Block()` avec 3 fallbacks (div → commentaires HTML → positionnel). Supporte aussi l'ancien format key:value en fallback

### Documentation (dogfooding)

- openclew documente openclew : créer docs via `openclew add ref/log`
- Tout en **anglais**, autonome (zéro référence à des projets externes)
- Logs immutables, committés dans `doc/log/`
- `doc_brief` obligatoire : décrit ce qui a été fait et pourquoi, pas ce que le doc contient
- Headings L2/L3 : `# Summary` et `# Details` (pas de préfixe "L2 -" / "L3 -")

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
| `lib/new-doc.js` | Création ref `doc/ref/TITLE.md` |
| `lib/new-log.js` | Création log `YYYY-MM-DD_title.md` |
| `lib/new-todo.js` | Création TODO `doc/todo/YYYY-MM-DD_title.md` |
| `lib/search.js` | Recherche keyword dans L1/metadata + parsers JS + `collectDocs()`/`walkDir()` (SSOT scan récursif, réutilisés par index-gen, MCP, migrate, peek, status) |
| `lib/status.js` | Dashboard santé docs (stats, missing brief, stale) |
| `lib/mcp-server.js` | MCP server stdio — search_docs, read_doc, list_docs |
| `lib/index-gen.js` | Génération `_INDEX.md` en JS natif (réutilise parsers de search.js) |
| `lib/migrate.js` | Migration legacy → format openclew + `--repoint` pour related_docs |
| `UPGRADING.md` | Guide upgrade user-facing (version notes, étapes, limitations) |
| `templates/ref.md` | Template référence ref |
| `templates/log.md` | Template référence log |
| `commands/oc-*.md` | Slash commands Claude Code (installées par `init`) |
| `skills/oc-*/` | Skills OpenClaw (SKILL.md) pour onboarding agents |
| `examples/` | Exemples simple-project et with-claudemd |

## Pièges connus

| Piège | Solution |
|-------|----------|
| Hook pre-commit des anciennes versions appelle Python | `init` nettoie automatiquement `doc/generate-index.py` legacy |
| npm publish demande 2 auth (login + OTP 2FA) | Utiliser `rocpublish` (alias zsh = cd + login + publish). Toujours 2 validations navigateur, c'est normal côté npm |
| Node.js et Rust binary coexistent dans le PATH | `openclew --version` affiche `(node)` ou `(rust)`. `openclew status` détecte les doublons. Le Rust ne supporte que init/index/mcp |
| Hook pre-commit bridge_check pas activé après clone | `git config core.hooksPath .githooks` (local, non commité). Active le hook `.githooks/pre-commit` qui appelle `R.AlphA.Doc/scripts/bridge_check.py` + `scripts/check_version_sync.sh` |
| Version désynchronisée `package.json` ↔ `rust/Cargo.toml` | Utiliser `scripts/bump.sh X.Y.Z` pour un bump atomique des 3 fichiers (package.json + Cargo.toml + Cargo.lock). Le hook pre-commit bloque tout commit avec des versions drift. Process : voir `doc/ref/RELEASE.md` |

## TODO

Voir [`TODO.md`](TODO.md)

