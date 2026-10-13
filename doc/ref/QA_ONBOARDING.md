clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-13 · doc_version: 1.0.0 · type: Reference · status: Active · category: QA · keywords: [onboarding, test, agent, copilot, cursor, claude-code, gemini, cline, codex, instruction-files, verdict]

- **subject:** Protocole de test — l'agent IA détecte-t-il et utilise-t-il le bloc injecté ?
- **doc_brief:** L'injection openclew n'a de valeur que si elle change le comportement de l'agent ; on la teste sur un projet factice avec des questions naturelles qui ne mentionnent jamais openclew, et on note chaque scénario sur 4 critères (détection, navigation, utilisation, verdict A/B/C/D). Un A sur les scénarios « cold start » (D et E) prouve que l'injection fonctionne pour cet outil.

---

# Summary

## Objectif
Vérifier que le bloc injecté dans un instruction file **change réellement le comportement de l'agent**. Si l'agent l'ignore, l'injection ne sert à rien.

## Principe
Projet factice + instruction file + `openclew init`, puis des **questions naturelles** (comme un vrai utilisateur). On observe si l'agent consulte la doc ou fonce dans le code.

## Ce qu'on teste

1. **Détection** : l'agent voit-il le bloc dans son instruction file ?
2. **Navigation** : consulte-t-il `doc/_INDEX.md` ou `doc/ref/` avant d'agir ?
3. **Utilisation** : lit-il les refs/logs pertinents ?
4. **Valeur ajoutée** : sa réponse est-elle meilleure grâce à la doc ?

## Grille de verdict

| Score | Verdict | Critère |
|---|---|---|
| A | Excellent | L'agent cite la doc, la lit et s'en sert dans sa réponse |
| B | Partiel | L'agent mentionne la doc sans la lire, ou la lit sans s'en servir |
| C | Invisible | L'agent ignore complètement le bloc |
| D | Cassé | Le bloc perturbe l'agent (erreurs, confusion) |

---

# Details

## 1. Setup du projet test

### Règle d'isolation
**Le dossier test ne contient JAMAIS le mot « openclew »** (nom, `package.json`, fichiers). Sinon le test est biaisé. Recette complète reset → scaffold → install : `QA_INSTALL.md` § 6.

### Projet cible

```bash
mkdir -p /tmp/my-api/src && cd /tmp/my-api
git init

cat > src/server.js << 'JS'
const express = require('express');
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/users', (req, res) => res.json([]));
app.listen(3000);
JS

cat > package.json << 'JSON'
{ "name": "test-api", "version": "1.0.0", "main": "src/server.js" }
JSON
```

### Instruction file selon l'agent

| Agent | Fichier à créer avant `init` |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| Gemini CLI | `.gemini/GEMINI.md` |
| Cline | `.clinerules` (fichier) |
| Codex / OpenClaw | `AGENTS.md` (ou rien : `init` le crée) |

`init` n'injecte que dans un **fichier**. Les formes dossier (`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`) sont détectées mais jamais retenues comme entry point : `init` crée alors `AGENTS.md`. Pour tester ces outils, utiliser la forme fichier ci-dessus. Si `AGENTS.md` existe déjà, il est prioritaire sur tout autre fichier.

Contenu minimal :

```markdown
# Project Instructions

This is a Node.js REST API using Express and PostgreSQL.

## Conventions
- async/await, no callbacks
- Tests with Jest
- Auth via JWT
```

### Initialiser

```bash
npx openclew init          # ou : openclew init
```

Vérifier :
- le bloc `<!-- openclew_START -->` est injecté dans **l'instruction file de l'agent testé** (et pas dans un `AGENTS.md` créé à côté) ;
- `doc/ref/` et `doc/log/` contiennent guide + exemples ;
- `.openclew.json` pointe vers le bon entry point.

### Enrichir la doc (recommandé)

Remplacer les exemples par des docs réalistes, pour vérifier que l'agent s'en sert :

```bash
openclew add ref "Auth Design"
# remplir doc/ref/AUTH_DESIGN.md avec un contenu réel
```

## 2. Scénarios

**Règle** : ne jamais mentionner openclew dans les prompts.

| Scénario | Prompt | On observe |
|---|---|---|
| A — Demande simple (baseline) | `Add a POST /users endpoint with validation` | L'agent consulte-t-il la doc avant de coder ? |
| B — Sujet documenté | `How does auth work in this project?` | Lit-il `doc/ref/AUTH_DESIGN.md` ou invente-t-il ? |
| C — Architecture | `I want to add a Redis cache layer. Where should it go?` | Regarde-t-il `doc/ref/ARCHITECTURE.md` ? |
| D — Doc-first | `What should I know before working on this project?` | Mentionne-t-il les docs, l'index, la structure ? |
| E — Cold start | `I'm new here. Walk me through this codebase.` | Commence-t-il par la doc ou par `ls src/` ? |

## 3. Grille d'évaluation par scénario

```
Agent: [nom + version]
Instruction file: [chemin]
Date: YYYY-MM-DD

| Scénario | Détection | Navigation | Utilisation | Verdict | Notes |
|----------|-----------|------------|-------------|---------|-------|
| A        |           |            |             |         |       |
| B        |           |            |             |         |       |
| C        |           |            |             |         |       |
| D        |           |            |             |         |       |
| E        |           |            |             |         |       |
```

| Colonne | Valeur | Question |
|---|---|---|
| Détection | oui/non | L'agent a-t-il lu l'instruction file contenant le bloc ? |
| Navigation | oui/non | A-t-il ouvert `doc/_INDEX.md` ou une ref de `doc/ref/` ? |
| Utilisation | oui/non | La réponse s'appuie-t-elle sur le contenu des docs ? |
| Verdict | A/B/C/D | Cf. grille du Summary |

## 4. Spécificités par agent

Matrice complète de chargement automatique : `INSTRUCTION_FILES_AUTOLOAD.md`.

### GitHub Copilot (VS Code)
- Prérequis : extension Copilot active + abonnement.
- Ouvrir le chat Copilot, poser un scénario, regarder la section « References » de la réponse : `.github/copilot-instructions.md` doit y figurer.
- Piège : les références ne s'affichent pas toujours. Leur absence ne prouve pas que le fichier n'est pas lu.

### Cursor
- `.cursorrules` (legacy, toujours lu) : c'est la forme que `init` sait cibler.
- `.cursor/rules/*.mdc` : une règle n'est appliquée automatiquement que si son frontmatter contient `alwaysApply: true`.

```
---
alwaysApply: true
---
```

### Claude Code
`CLAUDE.md` est toujours lu, sans configuration. Lancer `claude` dans le projet et poser les scénarios.

### Gemini CLI
`.gemini/GEMINI.md` est lu automatiquement. Lancer `gemini` dans le projet.

### Cline (VS Code)
Les règles sont injectées dans le prompt système et activables une par une : vérifier que la règle est active (toggle dans le panneau Cline).

## 5. Résultat attendu

Un A sur les scénarios D et E **prouve** que l'injection fonctionne pour cet agent. Un C partout = injection invisible : chercher pourquoi (chargement automatique désactivé, fichier non lu, bloc trop discret).

## 6. Actions post-test

| Verdict global | Action |
|---|---|
| A partout | L'outil est supporté : le documenter dans le README |
| B majoritaire | Rendre le wording du bloc injecté plus directif (`templates/embedded/inject-block.md`) |
| C majoritaire | Vérifier le chargement automatique (`INSTRUCTION_FILES_AUTOLOAD.md`). Fichier lu mais bloc ignoré → remonter le bloc, titre plus visible |
| D | Bug : ouvrir une issue openclew |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (rapatriée depuis la doc interne) |
