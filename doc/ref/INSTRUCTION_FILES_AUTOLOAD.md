clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-13 · doc_version: 1.0.0 · type: Reference · status: Active · category: Ecosystem · keywords: [instruction-files, auto-loading, entry-point, CLAUDE.md, AGENTS.md, cursorrules, copilot, windsurf, cline, gemini, aider, antigravity, detect]

- **subject:** Fichiers d'instructions — chargement automatique par outil IA
- **doc_brief:** Le bloc openclew n'est vu que si l'outil charge automatiquement le fichier qui le contient ; c'est garanti pour `CLAUDE.md`, `.github/copilot-instructions.md`, `.clinerules`, `AGENTS.md` (Codex, OpenClaw) et `.gemini/GEMINI.md`, conditionnel pour les règles Cursor/Windsurf en dossier, et absent pour `CONVENTIONS.md` (Aider). `init` détecte 11 emplacements mais n'injecte que dans un fichier, avec `AGENTS.md` prioritaire.

---

# Summary

## Objectif
Répondre à : **quand openclew injecte un bloc dans un fichier d'instructions, l'agent va-t-il le lire sans action de l'utilisateur ?** Sinon l'injection est invisible et l'utilisateur doit configurer quelque chose.

## Matrice de chargement automatique

| Fichier | Outil | Auto-lu ? | Nuances |
|---|---|---|---|
| `CLAUDE.md` | Claude Code | **Oui** | Hiérarchie : `~/.claude/CLAUDE.md` (global), puis dossiers parents et cwd ; sous-dossiers chargés à la demande. Imports `@chemin` possibles |
| `.cursorrules` | Cursor | **Oui** | Legacy, déprécié au profit de `.cursor/rules/` |
| `.cursor/rules/*.mdc` | Cursor | **Dépend** | Par règle : `alwaysApply: true` = oui ; `Auto` = selon globs ; `Agent Requested` / `Manual` = non |
| `.github/copilot-instructions.md` | GitHub Copilot | **Oui** | Silencieux, joint à chaque requête ; visible dans « References » |
| `.windsurfrules` | Windsurf | **Oui** (fragile) | Limites de taille (~6 000 caractères par règle, ~12 000 au total) ; fiabilité variable selon les versions |
| `.windsurf/rules/*.md` | Windsurf | **Dépend** | « Always On » = oui ; « Manual » = @-mention requise |
| `.clinerules` / `.clinerules/*.md` | Cline | **Oui** | Règles actives injectées dans le prompt système ; activables une à une ; global + projet |
| `AGENTS.md` | OpenAI Codex | **Oui** | Hiérarchie racine → cwd, concaténée ; plafond 32 KiB ; `AGENTS.override.md` prioritaire |
| `AGENTS.md` | OpenClaw | **Oui** | Injecté aussi dans les sous-agents |
| `.gemini/GEMINI.md` | Gemini CLI | **Oui** | `~/.gemini/GEMINI.md` (global) + fichiers du cwd jusqu'à la racine `.git`, concaténés |
| `.antigravity/rules.md` | Antigravity | **Non documenté** | Détecté par openclew, chargement non vérifié |
| `CONVENTIONS.md` | Aider | **Non** | Chargement explicite : `--read CONVENTIONS.md` ou `read: CONVENTIONS.md` dans `.aider.conf.yml` |

## Conséquences pour openclew

| Niveau | Fichiers |
|---|---|
| Injection fiable | `CLAUDE.md`, `.github/copilot-instructions.md`, `.clinerules`, `AGENTS.md` (Codex, OpenClaw), `.gemini/GEMINI.md` |
| Injection conditionnelle | `.cursor/rules/*.mdc` (si `alwaysApply: true`), `.windsurf/rules/*.md` (si « Always On ») |
| Fonctionne mais déprécié / fragile | `.cursorrules`, `.windsurfrules` |
| Action utilisateur requise | `CONVENTIONS.md` (Aider) |

---

# Details

## Détection et choix de l'entry point

Liste détectée (SSOT `lib/detect.js`, miroir `rust/src/detect.rs`), dans cet ordre :

| # | Fichier | Outil (libellé openclew) | Type |
|---|---|---|---|
| 1 | `CLAUDE.md` | Claude Code | fichier |
| 2 | `.cursorrules` | Cursor | fichier |
| 3 | `.cursor/rules` | Cursor | dossier |
| 4 | `.github/copilot-instructions.md` | GitHub Copilot | fichier |
| 5 | `.windsurfrules` | Windsurf | fichier |
| 6 | `.windsurf/rules` | Windsurf | dossier |
| 7 | `.clinerules` | Cline | fichier ou dossier |
| 8 | `.antigravity/rules.md` | Antigravity | fichier |
| 9 | `.gemini/GEMINI.md` | Gemini CLI | fichier |
| 10 | `CONVENTIONS.md` | Aider | fichier |
| 11 | `AGENTS.md` (insensible à la casse, scan séparé) | Codex / Gemini | fichier |

Règles de `init` :
1. `AGENTS.md` présent (toute casse) → proposé en premier, retenu par défaut en non interactif.
2. Sinon, choix parmi les **fichiers** détectés ; les dossiers (`.cursor/rules`, `.windsurf/rules`, `.clinerules/`) sont ignorés. En non interactif : le premier de la liste.
3. Rien de détecté → création d'`AGENTS.md`.

Le choix est mémorisé dans `.openclew.json` (`entryPoint`).

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Projet qui n'a que des règles en dossier (`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`) | `init` crée `AGENTS.md`, que ces outils peuvent ne pas lire | Ajouter une règle toujours active qui renvoie à `AGENTS.md`, ou utiliser la forme fichier (`.cursorrules`, `.windsurfrules`, `.clinerules`) |
| `CLAUDE.md` et `AGENTS.md` coexistent | `AGENTS.md` est retenu ; cette cartographie ne le donne pas comme lu par Claude Code | Importer `@AGENTS.md` depuis `CLAUDE.md`, ou choisir `CLAUDE.md` en interactif |
| Entry point = `CONVENTIONS.md` | Bloc invisible pour Aider sans config | Ajouter `read: CONVENTIONS.md` dans `.aider.conf.yml` |
| Règle `.mdc` sans `alwaysApply: true` | Bloc ignoré par Cursor | Ajouter le frontmatter `alwaysApply: true` |
| Libellé « Codex / Gemini » sur `AGENTS.md` | Gemini CLI lit `GEMINI.md` par défaut ; `AGENTS.md` seulement si son nom de fichier de contexte est configuré | Pour Gemini CLI, préférer `.gemini/GEMINI.md` |

Le choix de l'entry point détermine directement la valeur du premier jour : un bloc dans un fichier non chargé = openclew invisible. Vérification empirique par outil : `QA_ONBOARDING.md`.

## Sources (relevé de mars 2026, à revérifier : ces comportements évoluent vite)

- Claude Code : https://code.claude.com/docs/en/memory
- Cursor : https://cursor.com/docs/context/rules
- GitHub Copilot : https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
- Windsurf : https://docs.windsurf.com/windsurf/cascade/memories
- Cline : https://cline.ghost.io/clinerules-version-controlled-shareable-and-ai-editable-instructions/
- OpenAI Codex : https://developers.openai.com/codex/guides/agents-md
- Gemini CLI : https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html
- Aider : https://aider.chat/docs/usage/conventions.html

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (rapatriée depuis la doc interne) |
