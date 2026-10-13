clw_log@0.9.1 · date: 2026-04-17 · type: Feature · status: Done · category: CLI · keywords: [todo, skill, slash-command, index, peek]

- **subject:** Ajout du skill /oc-todo — un TODO par doc dans doc/todo/ avec index auto-généré
- **doc_brief:** Introduction d'un troisième type de doc à côté des refs et des logs. Chaque TODO vit dans `doc/todo/YYYY-MM-DD_slug.md` avec un template minimal (Why it matters / Done looks like). Le `TODO.md` plat à la racine reste intact — la nouvelle structure le supplante sans l'écraser. L'index, la recherche et peek reconnaissent tous le nouveau type.
- **related_docs:** doc/ref/FORMAT.md, doc/ref/INIT.md

---

# Summary

## Objectif

Donner à chaque tâche son propre doc pour qu'elle puisse porter un subject, un brief et une justification — pas seulement une case à cocher. Le TODO reste ainsi découvrable dans l'index à côté des refs et des logs.

## Problème

Le `TODO.md` plat à la racine du projet convient pour des cases à cocher triviales, mais il ne peut pas porter de contexte. Une tâche comme « corriger le scoring de pertinence de la recherche » a besoin d'une justification et d'une définition du « fini » qu'une case à cocher ne supporte pas. Les utilisateurs oubliaient pourquoi un TODO comptait, ou réinventaient une convention de doc séparée dans chaque projet.

## Solution

- **Nouveau type** : marqueur `clw_todo@VERSION` en ligne 1, parallèle à `clw_ref@` / `clw_log@`.
- **Nouveau dossier** : `doc/todo/YYYY-MM-DD_slug.md` — un fichier par tâche.
- **Template minimal** : subject + doc_brief en L1, puis deux sections courtes (`Why it matters`, `Done looks like`). Volontairement court — les détails d'implémentation vont dans un log quand le travail démarre.
- **UX centrée sur la slash command** : `/oc-todo "Title"` est le point d'entrée. Les utilisateurs ne tapent jamais `openclew add todo` eux-mêmes.
- **Index** : `doc/_INDEX.md` gagne une section **## TODOs**. Open/In progress triés en premier, Done en bas.
- **Peek** : liste les TODOs Open pour que les agents les voient en cartographiant avant de travailler.
- **Recherche** : parse `clw_todo@`, scanne `doc/todo/`, affiche l'icône `☐`.

Le `TODO.md` existant à la racine n'est **pas** touché. Les deux peuvent coexister — les projets migrent à leur rythme.

---

# Details

## Fichiers créés

| Fichier | Rôle |
|------|------|
| `lib/new-todo.js` | Crée `doc/todo/YYYY-MM-DD_slug.md` à partir du template |
| `skills/oc-todo/SKILL.md` | Skill invocable par l'utilisateur avec de courtes consignes de documentation |
| `commands/oc-todo.md` | Slash command Claude Code `/oc-todo "Title"` |
| `templates/todo.md` | Template de référence (parallèle à `templates/ref.md` / `log.md`) |

## Fichiers modifiés

| Fichier | Changement |
|------|--------|
| `lib/templates.js` | Ajout de `todoDocContent(title)` |
| `lib/search.js` | `parseMetadataLine()` reconnaît `clw_todo@`, `collectDocs()` scanne `doc/todo/`, icône `☐` |
| `lib/index-gen.js` | Nouvelle section `## TODOs`, stats sur trois types (refs / todos / logs), tri Open en premier |
| `lib/peek.js` | Rapporte les TODOs Open/In progress |
| `lib/init.js` | Crée `doc/todo/` à côté de `doc/ref/` et `doc/log/` |
| `bin/openclew.js` | Dispatche les commandes `add todo` et `todo` seule |

## Cycle de vie des statuts

- `Open` — non commencé
- `In progress` — travail en cours (un log doit être créé lors de cette transition)
- `Done` — terminé ; le fichier reste dans `doc/todo/` et se trie en bas de l'index

Les TODOs Done restent en place (pas déplacés vers `doc/log/`) — plus simple, la trace reste à côté de son origine.

## Contrat du template

```
clw_todo@VERSION · created: YYYY-MM-DD · status: Open · priority: Normal · category: · keywords: []

- **subject:** <title>
- **doc_brief:**

---

# Summary

## Why it matters
## Done looks like
```

La consigne est « remplir 2 sections courtes, 1-2 lignes chacune ». Si le doc dépasse ~20 lignes, c'est probablement une ref, pas un TODO.

## Test en isolation

- `/tmp/openclew-todo-test/` — 3 TODOs créés avec des statuts variés
- Index généré : `0 refs, 3 todos, 0 logs`, Open/In progress en premier, Done en dernier
- `peek` rapporte 2 TODOs Open (exclut celui en Done)
- `search "search"` trouve les deux TODOs sémantique + pertinence
- Une collision de nom de fichier renvoie exit 1 avec un message clair

## Points ouverts

- Slash command pas encore propagée dans `~/.claude/commands/` — les utilisateurs qui relancent `openclew init` dans n'importe quel projet l'obtiendront (géré par `installSlashCommands()` dans `lib/init.js`, qui copie tout `commands/*.md`)
- Pas encore de port Rust — comme pour les autres nouvelles commandes
- Pas d'outil de migration de la liste plate `TODO.md` → `doc/todo/*.md` une tâche par fichier. Migration manuelle à la demande
