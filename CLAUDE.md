# openclew - Instructions projet

## Contexte

Package npm CLI — Long Life Memory for LLMs. Documentation structurée L1/L2/L3 pour projets, lisible par humains et agents IA.

Stack : Node.js (CLI), Markdown (templates). Zero dépendances. Pas de build.

**Nom** : jeu de mots **open** (open-source) + **OpenClaw** (agent IA viral) + **clew** (fil d'Ariane). Tagline : "Long Life Memory for LLMs".

**Documentation** : openclew n'a pas de `doc/` local pour ses logs/refs internes — ils vivent dans `R.AlphA.Doc/doc/` (préfixés `openclew-*`). Le `doc/` racine ici est généré par `openclew init` (dogfooding).

## Commandes

```bash
node bin/openclew.js help [--all]      # Usage CLI
node bin/openclew.js init              # Setup dans un projet
node bin/openclew.js add ref|log|todo "Title"
node bin/openclew.js search "auth"     # Recherche docs
node bin/openclew.js checkout          # Résumé fin de session
python3 scripts/qa.py                  # Checklist QA box-drawing
npm publish                            # Publier sur npm (alias `rocpublish`)
```

## Règles projet

### Doc-first obligatoire

En début de session : `/oc-peek` (ou lire `doc/_INDEX.md`) avant toute exploration de code.

### Langue

Tout le contenu du projet (code, docs, comments, L1/L2/L3, doc_brief) est en **anglais**. Ne jamais écrire en français même si la conversation l'est.

### Versioning

Préfixe `oc_`. SSOT : `package.json` → `version`. Bump atomique 3 fichiers (`package.json`, `rust/Cargo.toml`, `Cargo.lock`) via `scripts/bump.sh X.Y.Z`. Hook pre-commit bloque tout drift.

### Principe directeur — agent guide l'utilisateur

openclew doit être **proactif** : c'est l'agent (via le bloc injecté) qui suggère les actions — créer un doc, migrer un format, externaliser les TODO. Chaque fonctionnalité doit être auto-découvrable via les commandes, le bloc injecté, ou les messages de `status`.

### Conventions

- **Idempotence stricte** : chaque commande ré-exécutable sans effet de bord
- **Entry point unique** stocké dans `.openclew.json` (défaut AGENTS.md case-insensitive). Détection : `CLAUDE.md`, `.cursorrules`, `.cursor/rules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.windsurf/rules`, `.clinerules`, `AGENTS.md`, `.antigravity/rules.md`, `.gemini/GEMINI.md`, `CONVENTIONS.md`
- **Injection** via markers `<!-- openclew_START -->` / `<!-- openclew_END -->`
- **Templates** embarqués (`lib/templates.js`) + fichiers de référence (`templates/`)
- **Format doc** : SSOT `templates/FORMAT.md`. Marqueur L1 : `clw_ref@VERSION` / `clw_log@VERSION`. Parser rétrocompatible (3 fallbacks + ancien format key:value)
- **Dogfooding** : openclew documente openclew. Logs immutables. `doc_brief` obligatoire (assertion, pas narration). Headings L2/L3 = `# Summary` / `# Details`

### Intégrations cross-projet

- **R.AlphA.IDE** = consommateur principal : `collectDocs()` au boot, navigation L1→L2→L3 token-efficiente. Ref : `R.AlphA.IDE/CLAUDE.md` § Intégration openclew
- **R.AlphA.PF** = même objectif (structurer le knowledge dès la 1ère session). TODO PF : intégration L1/L2/L3 dans `_base.md`

## Fichiers clés

| Fichier / Domaine | Rôle |
|---|---|
| `bin/openclew.js` | Entry point CLI (dispatcher) |
| `lib/init.js` | Setup projet (dirs, entry point, inject, hook, index) |
| `lib/detect.js` + `lib/inject.js` + `lib/config.js` | Détection instruction files + injection bloc + `.openclew.json` |
| `lib/templates.js` | Templates embarqués + helpers (slugify, today, ocVersion) |
| `lib/new-doc.js` + `lib/new-log.js` + `lib/new-todo.js` | Création refs / logs / todos |
| `lib/search.js` | Recherche keyword + `collectDocs()` / `walkDir()` (SSOT scan récursif) |
| `lib/status.js` | Dashboard santé docs (stats, missing brief, stale) |
| `lib/mcp-server.js` | MCP server stdio (`search_docs`, `read_doc`, `list_docs`) |
| `lib/index-gen.js` | Génération `_INDEX.md` (JS natif) |
| `lib/migrate.js` | Migration legacy → format openclew + `--repoint` |
| `templates/FORMAT.md` | **SSOT format doc** (line 1 metadata, L1, L2, L3) |
| `templates/{ref,log,todo}.md` | Templates de référence |
| `commands/oc-*.md` | Slash commands Claude Code (installées par `init`) |
| `skills/oc-*/` | Skills OpenClaw (SKILL.md) pour onboarding agents |
| `examples/{simple-project,with-claudemd}/` | Exemples |
| `rust/` | Port Rust (init/index/mcp uniquement) |
| `UPGRADING.md` | Guide upgrade user-facing |
| `R.AlphA.Doc/doc/_OPENCLEW_ONBOARDING_TEST.md` | **Grille QA principale** (4 colonnes Impl/Raphaël/Victor/Autres) |
| `R.AlphA.Doc/doc/_OPENCLEW_INSTALL_TEST_PROCEDURE.md` | Procédure pas-à-pas install + test projet vierge |

## Pièges connus

| Piège | Solution |
|---|---|
| Hook pre-commit ancien appelle Python | `init` nettoie auto `doc/generate-index.py` legacy |
| `npm publish` demande 2 auth (login + OTP 2FA) | `rocpublish` (alias zsh) — 2 validations navigateur normales |
| Node.js et Rust binary coexistent | `openclew --version` affiche `(node)` ou `(rust)`. `openclew status` détecte. Rust = init/index/mcp uniquement |
| Hook pre-commit bridge_check pas actif après clone | `git config core.hooksPath .githooks` (local, non commité) |
| Version désync `package.json` ↔ `Cargo.toml` | `scripts/bump.sh X.Y.Z` (atomique). Hook pre-commit bloque tout drift. Process : `doc/ref/RELEASE.md` |

## TODO

Voir [`TODO.md`](TODO.md)
