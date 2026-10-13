clw_ref@0.9.1 · created: 2026-04-17 · updated: 2026-10-13 · type: Reference · status: Active · category: CLI · keywords: [init, setup, flags, gitignore, logs]

- **subject:** `openclew init` — déroulé du setup, flags et conventions (logs partagés par défaut)
- **doc_brief:** Référence de `openclew init` : ce qu'il crée, ses flags (`--hook`, `--no-inject`, `--private-logs`), et pourquoi les logs sont versionnés par défaut. Explique le changement de comportement du 2026-04-17 (arrêt de l'ajout de `doc/log/` au `.gitignore`) et l'opt-in pour les dépôts publics.

---

# Summary

## Objectif
Documenter le contrat de `openclew init` pour que les utilisateurs (et les agents) sachent exactement ce que la commande touche, ce qui est opt-in, et pourquoi les logs sont une **couche de connaissance partagée** plutôt qu'un carnet privé.

## Points clés
- `init` est idempotent : le relancer ne perd jamais de données, il ne fait que combler les manques.
- `init` n'ajoute **plus** `doc/log/` au gitignore. Les logs sont commités par défaut — c'est ce qui les rend utiles d'une session et d'un agent à l'autre.
- Le flag `--private-logs` restaure l'ancien comportement pour les dépôts publics où les notes personnelles/en cours doivent rester locales.
- Le CLI Node (`lib/init.js`) et le port Rust (`rust/src/cmd/init.rs`) honorent les mêmes flags.

---

# Details

## Ce que crée `init`

| Chemin | Rôle | Toujours ? |
|------|---------|---------|
| `~/.openclew/config.json` | Config globale (version, date d'installation) | Oui |
| `~/.claude/commands/oc-*.md` | Slash commands Claude Code au niveau utilisateur | Oui |
| `.github/prompts/oc-*.prompt.md` | Prompts Copilot au niveau projet | Si dans un projet |
| `doc/ref/` | Dossier des refs | Si dans un projet |
| `doc/log/` | Dossier des logs | Si dans un projet |
| `doc/todo/` | Dossier des docs TODO (une tâche par fichier) | Si dans un projet |
| `doc/ref/USING_OPENCLEW.md` | Guide d'onboarding | Si dans un projet |
| `doc/ref/ARCHITECTURE.md` | Ref d'architecture initiale | Si dans un projet |
| `doc/log/YYYY-MM-DD_setup-openclew.md` | Log d'exemple | Si dans un projet |
| `doc/_INDEX.md` | Index auto-généré | Si dans un projet |
| Point d'entrée (`AGENTS.md` etc.) | Bloc openclew injecté | Si dans un projet (sauf `--no-inject`) |
| `.openclew.json` | Config projet (pointeur vers le point d'entrée) | Si dans un projet |
| `.vscode/openclew-preview.css` + `settings.json` | Style de l'aperçu Markdown | Si dans un projet |
| `TODO.md` | Fichier TODO initial | Si dans un projet |
| `.git/hooks/pre-commit` | Hook de régénération auto de l'index | Seulement avec `--hook` |
| `.gitignore` (ajoute `doc/log/`) | Ignorer les logs dans git | Seulement avec `--private-logs` |

## Flags

| Flag | Effet |
|------|--------|
| `--hook` | Installe le hook pre-commit qui régénère `doc/_INDEX.md` à chaque commit |
| `--no-inject` | Saute l'injection du bloc openclew dans le fichier point d'entrée |
| `--private-logs` | Ajoute `doc/log/` au `.gitignore` (opt-in — pour les dépôts publics où les logs de session doivent rester locaux) |

## Pourquoi les logs sont versionnés par défaut

La promesse d'openclew est une **mémoire longue durée pour les LLM**. Les logs sont des faits figés et immuables issus des sessions passées. Leur valeur vient de ce qu'ils sont **lisibles par l'agent suivant, sur n'importe quelle machine, depuis un clone neuf**. Si les logs sont ignorés par git, la mémoire ne survit pas à un `git clone` — ce qui annule l'intérêt de l'outil.

Le flag `--private-logs` existe pour un seul cas : un dépôt open source dont le mainteneur ne veut pas publier ses notes de développement personnelles à côté du code. Dans ce scénario, les logs restent locaux et servent de carnet privé.

## Migration depuis les versions antérieures

Les projets initialisés avant le 2026-04-17 peuvent avoir `doc/log/` dans leur `.gitignore` (ajouté automatiquement par `init` à l'époque). Pour adopter le nouveau défaut :

1. Retirer la ligne `doc/log/` du `.gitignore`.
2. `git add doc/log/` pour commencer à suivre les logs existants.
3. Commiter.

Rien n'est fait automatiquement — la décision est propre à chaque projet.

---

## Changelog

| Date | Changement |
|------|--------|
| 2026-04-17 | Création initiale — documente les flags et le changement de comportement opt-in `--private-logs` |
| 2026-04-17 | Ajout de `doc/todo/` à la liste des dossiers créés par `init` (couplé au skill `/oc-todo`) |
| 2026-10-13 | Traduction en français |
