clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-13 · doc_version: 1.0.0 · type: Reference · status: Active · category: QA · keywords: [install, test, onboarding, init, procedure, recette]

- **subject:** Procédure d'installation et de test d'openclew sur un projet vierge
- **doc_brief:** Un test d'installation se fait toujours sur un projet jetable qui ne contient pas le mot « openclew » (`/tmp/my-api/`), avec un HOME isolé si l'on ne veut pas toucher la config globale ; `openclew init` crée `doc/{ref,log,todo}/`, un entry point avec bloc injecté, `.openclew.json`, `TODO.md`, l'index, les prompts Copilot et la config de preview VS Code, le hook pre-commit restant opt-in (`--hook`).

---

# Summary

## Objectif
Installer openclew sur un projet, vérifier ce que `init` a créé, puis vérifier qu'un agent IA s'en sert sans qu'on le lui demande. Le protocole d'évaluation de l'agent est dans `QA_ONBOARDING.md`.

## Points clés
1. **Installer** : `npx openclew init` (Node) ou `openclew init` (binaire Rust, cf. `RUST_PORT.md`).
2. **Vérifier** : bloc `<!-- openclew_START -->` injecté, `doc/ref/`, `doc/log/`, `doc/todo/`, `doc/_INDEX.md`, `.openclew.json`.
3. **Tester** : ouvrir une session agent et poser une question **sans mentionner openclew**.
4. **Toujours repartir de zéro** pour un nouveau test (§ 6).

## Commandes disponibles après init

| Commande | Rôle |
|---|---|
| `openclew add ref "Title"` | Crée `doc/ref/TITLE.md` |
| `openclew add log "Title"` | Crée `doc/log/YYYY-MM-DD_title.md` |
| `openclew add todo "Title"` | Crée un TODO fichier dans `doc/todo/` |
| `openclew search "query"` | Recherche dans la doc |
| `openclew peek` | Instruction file + refs + TODOs ouverts |
| `openclew checkout` | Résumé de fin de session + log pré-rempli |
| `openclew status` | Tableau de bord santé des docs |
| `openclew index` | Régénère `doc/_INDEX.md` |
| `openclew help [--all]` | Aide (rapide / complète) |

Sans binaire installé, préfixer par `npx` (`npx openclew peek`).

---

# Details

## 0. Règles d'isolation

- **Le dossier test ne contient JAMAIS le mot « openclew »** : ni nom de dossier, ni `package.json`, ni fichier préexistant. On simule un utilisateur qui ne connaît pas l'outil ; si l'agent voit le mot dans le contexte, le test est biaisé.
- Chemin de référence : `/tmp/my-api/` (recréé à la demande, non persistant).
- `init` écrit aussi **hors du projet** : `~/.openclew/config.json` et, si `~/.claude/` existe, les slash commands `~/.claude/commands/oc-*.md`. Pour un test sans effet de bord, lancer avec un HOME temporaire (`HOME=/tmp/oc-home` ; sous Windows, aussi `USERPROFILE`), ou ajouter `--no-commands`.

## 1. Créer un projet test

```bash
mkdir -p /tmp/my-api/src && cd /tmp/my-api
git init

cat > src/server.js << 'JS'
const express = require('express');
const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/users', (req, res) => res.json([]));
app.listen(3000);
JS

cat > package.json << 'JSON'
{ "name": "test-api", "version": "1.0.0", "main": "src/server.js" }
JSON

echo "node_modules/" > .gitignore
git add -A && git commit -m "chore: scaffold express API test"
```

Variante : pour tester la détection d'un instruction file existant (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`…), le créer avant l'étape 2.

## 2. Installer

```bash
cd /tmp/my-api
npx openclew init          # ou : openclew init
```

Ce que fait `init` (détail : `INIT.md`) :

| Étape | Effet |
|---|---|
| Dossiers | `doc/ref/`, `doc/log/`, `doc/todo/` |
| Entry point | `AGENTS.md` s'il existe ; sinon un instruction file détecté ; sinon création d'`AGENTS.md` |
| Injection | Bloc `<!-- openclew_START -->` … `<!-- openclew_END -->` dans l'entry point (sauf `--no-inject`) |
| Config | `.openclew.json` (`entryPoint`) |
| Docs seed | `doc/ref/USING_OPENCLEW.md`, `doc/ref/ARCHITECTURE.md` (seedé depuis l'instruction file), `doc/ref/OPENCLEW_FRAMEWORK_INTEGRATION.md`, `doc/log/YYYY-MM-DD_setup-openclew.md`, `TODO.md` |
| Index | `doc/_INDEX.md` |
| Copilot | `.github/prompts/oc-*.prompt.md` |
| VS Code | `.vscode/settings.json` + `.vscode/openclew-preview.css` |
| Claude Code | `~/.claude/commands/oc-*.md` si `~/.claude/` existe (sauf `--no-commands`) |
| Hook pre-commit | **Uniquement avec `--hook`** |
| `.gitignore` | Inchangé ; `--private-logs` y ajoute `doc/log/` |

En mode non interactif (pas de TTY), `init` prend `AGENTS.md` s'il existe, sinon le premier instruction file détecté, sans poser de question.

## 3. Vérifier l'installation

- [ ] `.openclew.json` existe et pointe vers le bon entry point
- [ ] Le bloc `<!-- openclew_START -->` est présent une seule fois dans l'entry point
- [ ] `doc/ref/`, `doc/log/`, `doc/todo/` existent
- [ ] `doc/ref/USING_OPENCLEW.md` et `doc/ref/ARCHITECTURE.md` existent
- [ ] `doc/_INDEX.md` liste les docs créés
- [ ] Relancer `init` ne modifie rien (idempotence)

## 4. Tester avec un agent

Ouvrir une session agent (Claude Code, Copilot, Cursor, Gemini CLI, Codex…) dans le projet. **Ne jamais mentionner openclew dans les prompts.**

Prompts de base :
- « What should I know before working on this project? »
- « I'm new here. Walk me through this codebase. »

Si l'agent consulte `doc/_INDEX.md` ou `doc/ref/*.md` avant de répondre, l'injection fonctionne. Scénarios complets et grille de verdict : `QA_ONBOARDING.md`. Pour savoir si l'outil lit bien l'entry point choisi : `INSTRUCTION_FILES_AUTOLOAD.md`.

## 5. Sur un vrai projet

```bash
cd ~/mon-projet
npx openclew init

openclew add ref "Auth Design"     # doc/ref/AUTH_DESIGN.md
openclew add log "Setup session"   # doc/log/YYYY-MM-DD_setup-session.md

# en fin de session
openclew checkout
```

## 6. Recette — reset complet

Chaque test (ou re-test) repart de zéro :

```bash
# 1. RESET
rm -rf /tmp/my-api /tmp/oc-home

# 2. SCAFFOLD
mkdir -p /tmp/my-api/src && cd /tmp/my-api
git init
echo '{ "name": "test-api", "version": "1.0.0", "main": "src/server.js" }' > package.json
echo 'const express = require("express"); const app = express(); app.get("/health", (req, res) => res.json({ status: "ok" })); app.get("/users", (req, res) => res.json([])); app.listen(3000);' > src/server.js
echo 'node_modules/' > .gitignore
git add -A && git commit -m "chore: scaffold express API test"

# 3. INSTALLER (HOME isolé : pas d'écriture dans la config globale)
HOME=/tmp/oc-home npx openclew init

# 4. OUVRIR dans l'outil à tester
code /tmp/my-api          # VS Code / Copilot
# cursor /tmp/my-api      # Cursor
# claude                  # Claude Code (depuis /tmp/my-api)

# 5. TESTER : prompts sans mentionner openclew (cf. QA_ONBOARDING.md)
# 6. NOTER : grille de QA_ONBOARDING.md § 3
```

Attention : un HOME isolé masque aussi la config globale de l'agent testé (ex. `~/.claude/`). Pour tester les slash commands Claude Code, lancer `init` avec le vrai HOME.

## Structure attendue après init

```
/tmp/my-api/
  .github/prompts/oc-{checkout,init,peek,search,status}.prompt.md
  .vscode/settings.json
  .vscode/openclew-preview.css
  .openclew.json
  .gitignore
  AGENTS.md                 (bloc openclew injecté)
  TODO.md
  package.json
  src/server.js
  doc/
    _INDEX.md
    ref/
      USING_OPENCLEW.md
      ARCHITECTURE.md
      OPENCLEW_FRAMEWORK_INTEGRATION.md
    log/
      YYYY-MM-DD_setup-openclew.md
    todo/
```

Les refs vivent dans `doc/ref/SUBJECT.md`. Les anciennes refs `doc/_SUBJECT.md` restent lues par le parser (rétrocompatibilité).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (rapatriée depuis la doc interne) |
