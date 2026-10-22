clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-19 · doc_version: 1.1.0 · type: Reference · status: Active · category: CLI · keywords: [cli, add, search, status, checkout, peek, index, session-header, mcp, help, guidance]

- **subject:** Conception de la CLI openclew — commandes, contrats et principe « l'agent guide l'utilisateur »
- **doc_brief:** La CLI expose 7 commandes essentielles (`init`, `add ref|log|todo`, `search`, `peek`, `checkout`) et 6 avancées (`status`, `review`, `migrate`, `index`, `session-header`, `mcp`) visibles via `help --all`. `search` classe par score pondéré sur L1 et la ligne de métadonnées, `status` mesure la santé de la doc et détecte le legacy, `checkout` pré-remplit un log depuis les commits du jour, `mcp` expose les docs aux agents en JSON-RPC stdio. Chaque commande se termine par un message qui dit quoi faire ensuite.

---

# Summary

## Objectif
Fixer le contrat de chaque commande et les décisions de conception qui les sous-tendent, pour qu'une évolution de la CLI (Node ou Rust) reste cohérente. `init` est couvert par [INIT.md](INIT.md), le format des docs par [FORMAT.md](FORMAT.md), la mise à niveau par [MIGRATION.md](MIGRATION.md).

## Points clés
- **Verbe + nom** : `add ref`, `add log`, `add todo` (pattern Hugo/nb/clig.dev). `add` = ajouter à une collection ; `ref` plutôt que `doc` générique. Les anciens `new`, `log`, `todo` restent des alias.
- **Help à 2 niveaux** : `help` montre les 7 commandes du quotidien ; `help --all` ajoute les commandes avancées. Un nouvel utilisateur n'est pas noyé. (Le binaire Rust utilise l'aide générée par clap, à un seul niveau.)
- **Recherche sans infra** : pas d'embeddings ni de base vectorielle, un scoring pondéré sur L1 + métadonnées, zéro dépendance.
- **Une source de parsing** : `lib/search.js` (`collectDocs`, `parseFile`) est réutilisé par `index`, `status`, `peek`, `mcp` — un seul scanner récursif (`walkDir`).
- **L'agent guide l'utilisateur** : chaque sortie dit l'étape suivante ; le bloc injecté pousse l'agent à proposer refs, logs et migrations plutôt que d'attendre qu'on les lui demande.
- **Parité Node ↔ Rust** : toutes les commandes existent dans les deux implémentations ; `migrate` y est désactivée à l'identique (même message, SSOT `templates/embedded/migrate-deprecated.txt`).

---

# Details

## Inventaire des commandes

| Commande | Niveau help | Effet | Écrit des fichiers ? |
|---|---|---|---|
| `init` | défaut | Setup projet (voir [INIT.md](INIT.md)) | Oui |
| `add ref <titre>` | défaut | Crée `doc/ref/<SLUG>.md` depuis le template | Oui |
| `add log <titre>` | défaut | Crée `doc/log/YYYY-MM-DD_<slug>.md` | Oui |
| `add todo <titre>` | défaut | Crée `doc/todo/YYYY-MM-DD_<slug>.md` (une tâche par fichier) | Oui |
| `search <requête>` | défaut | Recherche pondérée dans refs, logs, todos | Non |
| `peek` | défaut | Fichier d'instructions + refs + TODO ouverts | Non |
| `checkout` | défaut | Résumé git du jour + log pré-rempli | Oui (log, index) |
| `status` | `--all` | Dashboard santé de la doc | Non |
| `review` | `--all` | Refs à revoir (péremption), top N, `--json` | Non |
| `migrate` | masquée | **Obsolète, désactivée depuis 0.11.0** : affiche un renvoi vers `npx openclew@0.9.0 migrate` (voir [MIGRATION.md](MIGRATION.md)) | Non |
| `index` | `--all` | Régénère `doc/_INDEX.md` | Oui |
| `session-header` | `--all` | Formate une ligne d'en-tête de session | Non |
| `mcp` | `--all` | Serveur MCP stdio | Non |

`openclew --version` affiche `(node)` ou `(rust)` pour savoir quel binaire est actif. Après chaque commande, la version Node vérifie au plus une fois par jour si une version plus récente existe sur npm (non bloquant, cache dans `~/.openclew/update-check.json`).

## `add ref | log | todo`

- **Slug** : refs en majuscules (`doc/ref/API_DESIGN.md`), logs et todos en minuscules préfixés par la date du jour.
- **Refus d'écraser** : si le fichier existe, la commande sort en erreur. Pour une ref, l'emplacement legacy `doc/_<SLUG>.md` est aussi vérifié.
- **Pré-requis** : `doc/` doit exister (sinon : « Run 'openclew init' first »). `doc/ref/` et `doc/todo/` sont créés à la volée ; `doc/log/` doit déjà exister. Absence de `.openclew.json` = simple avertissement.
- **Guidage post-création** : chaque type rappelle quoi remplir — ref : L1 (subject, status, keywords), L2 (objectif + points clés), L3 si besoin ; log : subject + doc_brief, problème + solution, et « les logs sont immuables » ; todo : « Why it matters » et « Done looks like », en restant court.
- **Contenu** : toujours issu de `templates/embedded/*.md` (SSOT partagé Node/Rust), jamais réécrit dans le code.

## `search`

Requête découpée en termes séparés par des espaces. Chaque terme est cherché (sous-chaîne, insensible à la casse) dans six champs, avec un poids :

| Champ | Poids |
|---|---|
| `subject` | 3 |
| `doc_brief` | 2 |
| `keywords` | 2 |
| `category` | 1.5 |
| `type` | 1 |
| `status` | 0.5 |

- Bonus de `+50 %` du poids quand le terme correspond à un mot entier (`\b…\b`).
- Les scores s'additionnent sur tous les termes et tous les champs ; un doc qui ne matche qu'un terme sur deux est quand même retourné (logique OU pondérée, pas un ET strict).
- Seuls les docs avec score > 0 sortent, triés par score décroissant. Le corps L2/L3 n'est **pas** indexé : un bon `subject` et un bon `doc_brief` font la trouvabilité.
- Périmètre : refs (`doc/ref/**`, plus `doc/_*.md` legacy), logs (`doc/log/**`), todos (`doc/todo/**`). Ignorés : `_archive/`, `old/`, `notes/`, `verify_logs/`, `_INDEX.md`.
- Un fichier n'est retenu que si son L1 est lisible (format actuel, ou `key: value` legacy).

## `peek`

Outil de découverte avant de travailler : nom du fichier d'instructions (`CLAUDE.md` puis `AGENTS.md`), refs de `doc/` avec subject et status, TODO ouverts de `doc/todo/` (statuts open, in progress, wip, blocked), fichiers `_*.md` hors de `doc/`, et sous-dossiers de `doc/`. C'est la commande que le bloc injecté demande en début de conversation quand aucun serveur MCP n'est branché.

## `status`

Dashboard de santé, en lecture seule :

- **Volumes** : refs, logs, total.
- **Legacy** : compte les docs dont le format est ancien et renvoie vers `migrate` (détail dans [MIGRATION.md](MIGRATION.md)).
- **Coexistence** : avertit si plusieurs binaires `openclew` sont dans le `PATH` et indique lequel est actif.
- **Manques L1** : docs sans `doc_brief`, docs sans `subject`.
- **Refs périmées** : `updated` (ou `created`) de plus de 30 jours, ou sans date.
- **Traçabilité des TODO** : todos `Done` sans `closed`, todos sans `from` ; dans `TODO.md`, items sans marqueur `from`, items cochés sans `closed`, items cochés de plus de 7 jours à purger **manuellement** (archiver, jamais supprimer).
- **TODO dans le fichier d'instructions** : si des cases à cocher y traînent et qu'il n'y a pas de `TODO.md`, suggère `migrate --todo`.
- **Distributions** par status et par category.
- **Score de santé** = (docs avec brief + docs avec subject + refs fraîches) / (2 × total + nombre de refs). 100 % = tout est renseigné et aucune ref n'est périmée.

## `review`

Nettoyage continu des refs, sans suppression ni déplacement. Mécanisme complet : [PEREMPTION_DES_REFS.md](PEREMPTION_DES_REFS.md).

| Forme | Effet |
|---|---|
| `review [--top N] [--json]` | Lecture seule : candidates triées par score (`deprecated` 3 ; `orphan`, `transient`, `twin` 2 ; `dead_paths` 1), puis par âge |
| `review --apply [--commit]` | Gestes déterministes : chemin mort au déplacement prouvé → rafraîchi ; redirection au remplaçant prouvé → `status: Archived` + `superseded_by`. Refs non commitées ignorées. `--commit` : commit dédié des seuls fichiers touchés |
| `review --confirm <ref> --why <texte>` | Geste jugé : pose `reviewed: <date>`, la ref sort du score pendant 90 jours |
| `review --archive <ref> [--superseded-by <ref>] --why <texte>` | Geste jugé : archive sur place ; le remplaçant doit exister |

Chaque geste s'ajoute au journal `doc/review-journal.md` (date, `auto`/`agent`, ref, geste, raison). Titre du commit dédié : anglais accordé par défaut ; un projet le remplace dans `.openclew.json` par `"reviewCommit": { "one": "…", "many": "… {{COUNT}} …" }` (`init` conserve cette clé). Seuils, poids et dossiers ignorés : `templates/embedded/review.json`.

## `checkout`

Résumé de fin de session, pensé pour le moment où l'on oublie d'écrire le log :

1. Collecte les commits du jour (`git log --since` minuit, sans merges), les changements non commités, les logs déjà créés aujourd'hui et la liste des refs.
2. Affiche les commits (type extrait des Conventional Commits : feat → Feature, fix → Fix…), les fichiers non commités (10 max), l'état des logs du jour et la liste des refs à vérifier.
3. S'il y a des commits, crée `doc/log/YYYY-MM-DD_<slug>.md` depuis `templates/embedded/checkout-log.md` : titre dérivé des commits, `keywords` = scopes des commits, `doc_brief` = descriptions concaténées, section « What was done » = liste des commits. Ne réécrit jamais un log existant.
4. Régénère `doc/_INDEX.md` si un log a été créé.
5. Lance `review --apply --commit` (gestes déterministes, commit dédié), puis affiche les 3 premières candidates avec la consigne : ne lire que leur L1, appliquer 1 à 3 gestes jugés sûrs (`--confirm`, `--archive`), les signaler en une ligne, ne demander qu'en cas de doute réel. Sans geste ni candidate : aucune ligne.

Le log produit est un brouillon : l'utilisateur ou l'agent doit y ajouter le « pourquoi » et le résultat.

## `index`

Régénère `doc/_INDEX.md` à partir des L1 (refs, logs, todos ; todos ouverts d'abord). Implémentation native JS/Rust : l'ancien générateur Python a été retiré pour supprimer toute dépendance hors Node. L'index est un cache optionnel lisible par un humain ; les agents utilisent `peek` ou `list_docs`. Le hook pre-commit (option `--hook` de `init`) appelle `openclew index` si le binaire est disponible, sinon `npx --yes openclew index`, puis ajoute l'index au commit. Ne jamais éditer `_INDEX.md` à la main.

## `session-header`

`openclew session-header --name "Titre" --tags a,b [--date YYYY-MM-DD]` imprime une ligne d'en-tête normalisée (`📅 date 🏷️  titre -----  #a #b`), utilisée pour titrer une session de façon homogène. `--name` est obligatoire ; la date par défaut est celle du jour.

## `mcp`

Serveur MCP (protocole `2024-11-05`) en JSON-RPC sur stdio. Configuration côté agent : `{ "command": "openclew", "args": ["mcp"] }` (ou `npx` + `["openclew", "mcp"]`).

| Tool | Paramètres | Rôle |
|---|---|---|
| `search_docs` | `query` | Même moteur que `search` |
| `read_doc` | `path`, `level` (`L1`, `L2` par défaut, `L3`, `full`) | Lecture progressive : L1 = ligne de métadonnées + bloc L1, L2 = section `# Summary`, L3 = section `# Details` |
| `list_docs` | `kind` optionnel | Liste avec path, kind, subject, doc_brief, status, category |
| `create_ref`, `create_log` | `title`, `subject`, `brief`, `content` | Création pré-remplie (Rust uniquement) |
| `create_todo` | `title` | Création d'un todo (Rust uniquement) |

Le bloc injecté demande à l'agent d'utiliser les tools MCP en priorité et la CLI en repli. `read_doc` repose sur les headings exacts `# Summary` / `# Details` : un doc dont les headings divergent renvoie une section vide.

## Principe directeur : l'agent guide l'utilisateur

openclew ne doit pas attendre que l'utilisateur connaisse ses commandes. Concrètement :

- **Bloc injecté** dans le fichier d'instructions : demande à l'agent de lister et lire les docs avant toute tâche (instruction placée **en fin de bloc**, où elle est mieux respectée), de proposer `add ref` quand aucun doc ne couvre le sujet, et d'utiliser les commandes plutôt que d'écrire un doc à la main.
- **Messages post-commande** : chaque commande indique l'étape suivante (`add` → quoi remplir, `migrate` dry-run → relancer avec `--write`, `status` sans docs → `add ref`, legacy détecté → `migrate`).
- **Auto-découvrabilité** : toute fonctionnalité doit être atteignable par `help`, le bloc injecté ou un message de `status`. Une fonctionnalité qu'aucun de ces trois canaux ne mentionne est considérée comme invisible.
- **Intégrations** : slash commands Claude Code (`commands/oc-*.md`), prompts Copilot et skills au format `SKILL.md` (`skills/oc-*`, compatibles OpenClaw) reprennent les mêmes commandes pour les environnements d'agents.

## Pièges connus

| Piège | Correction / contournement |
|---|---|
| `add ref` refuse si un doc legacy `doc/_SLUG.md` existe | Déplacer le fichier dans `doc/ref/` à la main (le message le dit), puis relancer |
| `peek` ne détecte que `CLAUDE.md` / `AGENTS.md`, pas l'entry point de `.openclew.json` | Connu ; les autres fichiers d'instructions ne s'affichent pas dans `peek` |
| `list_docs` Node n'accepte que `ref` / `log` ; le Rust accepte aussi `todo` | Filtrer côté client ou utiliser le binaire Rust |
| `--no-inject` sans `.openclew.json` déclenchait un avertissement trompeur dans `add` / `checkout` | Corrigé : `init` écrit `{ entryPoint: null }` dans ce cas |
| Entrée non interactive (pipe) pendant `init` | Corrigé : sélection automatique du premier fichier d'instructions détecté |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (condensé de l'historique interne) |
| 2026-10-14 | `migrate` obsolète et désactivée (Node et Rust) |
| 2026-10-19 | Commande `review` (péremption des refs) et top 3 au `checkout` |
| 2026-10-19 | `review --apply`, `--confirm`, `--archive`, journal ; `checkout` lance la passe déterministe |
