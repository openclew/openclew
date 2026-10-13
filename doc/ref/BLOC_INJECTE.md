clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-13 · doc_version: 1.0.0 · type: Reference · status: Active · category: Agents · keywords: [inject, bloc-injecte, doc-first, agents-md, slash-commands, oc-, skills, copilot, prompts, npx, tests-agents]

- **subject:** Bloc injecté openclew — contenu, raisons de chaque partie, commandes `oc-*`, prompts Copilot et comportement réel des agents
- **doc_brief:** Le bloc injecté entre `<!-- openclew_START -->` et `<!-- openclew_END -->` est le seul levier qui change le comportement d'un agent : il impose la lecture de `doc/` avant toute tâche, la création d'une ref quand aucune ne couvre le sujet, et des commandes appelées directement avec `npx` en repli. Les agents testés le lisent, mais seuls les modèles suffisamment capables suivent ses directives.

---

# Summary

## Objectif
Expliquer ce que contient le bloc injecté dans le fichier d'instructions des agents, pourquoi chaque partie existe, et ce que les tests sur de vrais agents ont montré. Le texte exact n'est pas recopié ici : SSOT = `templates/embedded/inject-block.md`.

## Points clés
- **Injection** : `openclew init` écrit le bloc dans le point d'entrée détecté (défaut `AGENTS.md`), entre marqueurs. Une ré-exécution remplace le bloc existant au lieu de le dupliquer (idempotence). Détails du flux : `doc/ref/INIT.md`.
- **Doc-first impératif** : le bloc se termine par « IMPORTANT — Start of every conversation » (lister → choisir → lire → seulement ensuite travailler). Une formulation passive ne suffisait pas.
- **Pas de doc correspondante → proposer une ref** avant d'écrire du code. Sans cette consigne, l'agent ignorait `doc/` et partait directement dans le code.
- **Commandes** : MCP d'abord (`list_docs`, `read_doc`, `search_docs`), sinon CLI `openclew …`, avec repli `npx openclew …` si la commande est introuvable.
- **Commandes livrées** : slash commands Claude Code `oc-*` (`commands/`), skills `oc-*` (`skills/`), prompts Copilot (`prompts/`).
- **Tests d'agents** : le bloc est lu par Copilot Chat via `AGENTS.md` (verdict A sur projet vierge) ; le respect des directives dépend du modèle (un petit modèle les ignore, un modèle plus capable les suit).

---

# Details

## 1. Contenu actuel du bloc et justification

| Section du bloc | Contenu | Pourquoi |
|---|---|---|
| Project knowledge | `doc/` = base de connaissance | Donner à l'agent le point d'entrée sans qu'il ait à le deviner |
| Doc types | Refs (`doc/ref/*.md`, legacy `doc/_*.md`) vs logs (`doc/log/YYYY-MM-DD_*.md`) ; niveaux L1 → L2 → L3 | L'agent lit L1 pour juger la pertinence et ne descend qu'au besoin (économie de tokens) |
| Task tracking | `TODO.md` plat (défaut) ou `doc/todo/` (opt-in) ; règle `from` / `closed` | Traçabilité bidirectionnelle TODO ↔ log de session ; `openclew status` signale les manques |
| Rules | Pas de doc correspondante → proposer `openclew add ref` ; information manquante → demander, ne pas deviner ; format obligatoire via `openclew add` ; réponses courtes | Chaque règle corrige un comportement observé (voir § 2) |
| Commands | MCP d'abord, sinon CLI, repli `npx` | Un agent connecté au serveur MCP lit les docs sans shell ; sans MCP, la CLI reste disponible partout |
| IMPORTANT — Start of every conversation | Lister → choisir → lire → travailler | Formulation impérative en fin de bloc : meilleure adhésion des agents |

Le format d'une doc n'est pas décrit dans le bloc : il renvoie à `doc/ref/FORMAT.md` et aux commandes `openclew add`, qui génèrent un squelette conforme.

## 2. Évolution et raisons

| Étape | Changement | Problème corrigé |
|---|---|---|
| v1 | « Doc-first rule: before any task, read… » | Trop passif : directive ignorée |
| v3 | Étapes numérotées (lire l'index → choisir → lire) + création via commande au lieu d'un template à recopier | Un agent sans accès au template créait des docs au mauvais format (pas de ligne 1, pas de L1) |
| v4 | Étape « No matching doc? → propose creating a ref » + section de commandes de session (langage naturel → commande) | L'agent ignorait `doc/` quand rien ne correspondait ; l'utilisateur voulait dire « checkout » dans le chat plutôt que dans un terminal |
| 0.5.1 | Bloc renforcé : format obligatoire, demander au lieu de deviner ; `init` met à jour un bloc existant | Docs créées à la main hors format ; ré-exécution d'`init` sans effet |
| 0.6.0 | Règle ref-first | Les logs étaient utilisés pour du savoir durable qui relève d'une ref |
| 0.7.0 | Restructuration (types de docs, règles, commandes), chemin `doc/ref/*.md`, MCP d'abord, bloc final « IMPORTANT » | Meilleure adhésion ; alignement sur `doc/ref/` |
| Après 0.7.0 | Section Task tracking (`from` / `closed`) | Traçabilité des TODO |
| Actuel | Commande `openclew` appelée directement, `npx` seulement en repli | `npx` systématique est lent et inutile quand le binaire (Node ou Rust) est installé |

## 3. Commandes livrées par openclew

Toutes portent le préfixe `oc-` (cohérent avec le préfixe de version `oc_`) et le même repli : « si `openclew` est introuvable, passer par `npx openclew <command>` ».

| Surface | Fichiers | Installation | Contenu |
|---|---|---|---|
| Slash commands Claude Code | `commands/oc-checkout`, `oc-init`, `oc-peek`, `oc-raise`, `oc-search`, `oc-status`, `oc-todo` | `init` copie dans `~/.claude/commands/` si `~/.claude/` existe ; `--no-commands` pour désactiver | `oc-checkout` = résumé de fin de session (tableau statut / doc / commit, commit APRÈS le checkout) |
| Skills (format OpenClaw, `SKILL.md`) | `skills/oc-checkpoint`, `oc-init`, `oc-search`, `oc-todo` | Livrées dans le paquet npm, non copiées par `init` | Mêmes usages, découvrables par les agents compatibles |
| Prompts Copilot | `prompts/oc-checkout`, `oc-init`, `oc-peek`, `oc-search`, `oc-status` (`.prompt.md`) | `init` copie au niveau utilisateur (profil VS Code) ET projet (`.github/prompts/`) | Équivalents Copilot des slash commands |

Idempotence des slash commands : chaque fichier porte `<!-- openclew-managed -->`. `init` écrase un fichier qui contient encore le marqueur et saute un fichier modifié par l'utilisateur (marqueur retiré).

Prompts Copilot au niveau utilisateur (0.5.2) : chemins du profil VS Code — macOS `~/Library/Application Support/Code/User/prompts`, Windows `%APPDATA%\Code\User\prompts`, Linux `~/.config/Code/User/prompts`. Ils sont installés **avant** le garde-fou « répertoire de projet » d'`init`, car ils doivent fonctionner dans tous les projets : placés après, ils n'étaient jamais installés hors projet.

## 4. Tests sur agents réels

Méthode : projet factice réaliste (API Express), **aucune mention d'openclew** ni dans le nom du dossier ni dans le prompt ; seule action préalable = `openclew init`. Un mot canari dans le fichier d'instructions permet de confirmer que l'agent lit bien la version courante. Grille : A = détecte et utilise `doc/`, C = ignore.

| Agent / modèle | Scénario | Verdict | Constat |
|---|---|---|---|
| Copilot Chat, Claude Haiku 4.5 | « What should I know before working on this project? » | A | Cite `doc/`, l'index, L1/L2/L3, les conventions |
| Copilot Chat, Raptor mini | « Add auth, how to structure it? » | C | Lit le code directement, ignore `doc/` |
| Copilot Chat (VS Code), projet vierge avec `AGENTS.md` | « What should I know before working on this project? » | A | Lit `AGENTS.md` automatiquement ; cite L1/L2/L3, `doc/_INDEX.md` et la règle doc-first |
| Copilot, prompts utilisateur | Création de log via prompt | Corrigé | Les prompts marchaient, mais le format des logs n'était pas respecté → template complet ajouté dans `oc-checkout.prompt.md` |

Enseignements :
- Copilot charge le fichier d'instructions comme contexte avec tous les modèles, mais ne suit les directives comportementales qu'avec un modèle suffisamment capable.
- Une directive impérative et numérotée est mieux suivie qu'une règle descriptive.
- Demander à l'agent de **lancer une commande** (`openclew add`) est plus fiable que lui demander de **respecter un format** décrit en prose.
- Scénario d'implémentation (auth) non retesté avec un modèle capable : couverture partielle.

## 5. Écarts connus entre surfaces

- `prompts/oc-checkout.prompt.md` et `prompts/oc-init.prompt.md` décrivent encore l'ancien format (préfixe `openclew@`, marqueurs `<!-- L1_START -->`) alors que le format courant est `clw_log@` / `clw_ref@` avec L1 en Markdown pur (voir `doc/ref/FORMAT.md`).
- `commands/oc-search.md` et `skills/oc-search/SKILL.md` situent encore L1 « entre `L1_START`/`L1_END` ».
- Pas de prompt Copilot `oc-todo` (la slash command et le skill existent).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (condensé de l'historique interne) |
