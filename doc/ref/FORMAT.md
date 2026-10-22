clw_ref@0.9.1 · created: 2026-03-30 · updated: 2026-10-19 · doc_version: 1.5.0 · type: Reference · status: Active · category: Format · keywords: spec, L1, L2, L3, metadata, template, parser, doc_version, from, closed, targets_todos, flat_todo, purge, archive
- **subject:** Spécification du format de document openclew
- **doc_brief:** Chaque doc openclew est construit en 4 couches progressives — les métadonnées pour les machines, L1 comme fil d'Ariane pour saisir le sujet d'un coup d'œil, L2 pour un résumé tenant en un écran, et L3 pour le détail complet. On ne descend plus profond que lorsqu'on en a besoin.

---

# Summary

## Objectif
Ne jamais se perdre dans sa propre doc. Chaque document porte son propre fil (L1) : en quelques mots, un humain saisit le sujet d'un coup d'œil — et ne creuse que si nécessaire. Les agents IA en profitent aussi, mais le lecteur principal est humain.

## Points clés
- **Ligne 1** — métadonnées condensées (`key: value` séparés par ` · `). Pour les machines et l'indexation, pas pour la lecture.
- **L1 = le fil** — `**subject:**` + `**doc_brief:**` entre la ligne 1 et le premier `---`. ~40 tokens. Répond à : « est-ce que ça me concerne ? » Un humain qui parcourt 20 docs ne lit que les L1. Si le brief est bon, il sait en 3 secondes où creuser.
- **L2** — résumé tenant en un écran (~40 lignes). Assez de contexte pour la plupart des décisions, sans plonger dans les détails.
- **L3** — tout le reste. Code, exemples, approfondissements. On n'y va que lorsqu'on en a besoin.
- **Règle du doc_brief** : énoncer ce qui est vrai/décidé, pas ce que contient le document. S'il commence par « ce document décrit… », c'est du méta — réécrire.

## Préfixe de la ligne 1

| Préfixe | Type de doc | Exemple |
|--------|----------|---------|
| `clw_ref@VERSION` | Ref | `clw_ref@0.7.0 · created: 2026-04-10 · ... · doc_version: 1.0.0 · ...` |
| `clw_log@VERSION` | Log | `clw_log@0.7.0 · date: 2026-04-10 · ...` |
| `clw_todo@VERSION` | Doc TODO | `clw_todo@0.9.1 · created: 2026-04-17 · status: Open · ...` |
| `openclew@VERSION` | Legacy (les deux) | Supporté par le parser, non généré |

## Nommage des fichiers

| Type | Emplacement | Convention |
|------|----------|------------|
| Refs | `doc/ref/SUBJECT.md` | UPPER_SNAKE_CASE, sans préfixe |
| Refs (legacy) | `doc/_SUBJECT.md` | UPPER_SNAKE_CASE, préfixé `_` |
| Logs | `doc/log/YYYY-MM-DD_subject.md` | minuscules-avec-tirets, daté |
| TODOs | `doc/todo/YYYY-MM-DD_subject.md` | minuscules-avec-tirets, daté |
| Index | `doc/_INDEX.md` | Auto-généré, ne jamais éditer |

## Points d'attention
- La ligne 1 **doit** commencer par `clw_ref@`, `clw_log@`, `clw_todo@` ou `openclew@` — les autres préfixes sont ignorés par les parsers
- Le bloc L1 est **positionnel** : les lignes entre la ligne 1 et le premier séparateur `---`
- Les marqueurs div legacy (`<div class="oc-l1">`) et les marqueurs en commentaire (`<!-- L1_START -->`) restent supportés en repli

---

# Details

## Champs L1 (entre la ligne 1 et le premier `---`)

| Champ | Ref | Log | TODO | Description |
|-------|:---:|:---:|:----:|-------------|
| `subject` | oui | oui | oui | Titre en une ligne — de quoi parle le doc |
| `doc_brief` | oui | oui | oui | Conclusion en une ligne — ce qui est vrai/décidé |
| `related_docs` | optionnel | optionnel | — | Liste de chemins de refs/logs liés, séparés par des virgules |
| `targets_todos` | — | optionnel | — | TODOs (`doc/todo/*.md`) sur lesquels cette session a travaillé. **Lien d'entrée** pour ces TODOs |
| `from` | — | — | **requis** | Log/ref ou référence en texte libre indiquant d'où vient l'idée (remplace le legacy `entry_log`) |
| `closed` | — | — | **requis si Done** | Log ou référence de session où le TODO a été résolu (remplace le legacy `exit_log`) |

**La même règle s'applique au `TODO.md` plat :**

| Champ | Quand requis |
|---|---|
| `from`   | Toujours — à la création. Texte libre accepté (ex. `2026-04-29 — cold idea`). Ne jamais omettre. |
| `closed` | Quand le TODO est coché / `status: Done`. Texte libre accepté (ex. `2026-04-29 session — handled inline`). |

`openclew status` avertit (sans bloquer) sur les TODOs sans `from`, et sur les TODOs fermés sans `closed`.

## Format du TODO.md plat

La plupart des projets gardent un `TODO.md` plat à la racine. Chaque ligne suit :

```markdown
- [ ] **Title** : Description. <!-- from: doc/log/2026-04-26_audit.md -->
- [x] **Done title** : Description (2026-04-29). <!-- from: doc/log/2026-04-26_audit.md --> <!-- closed: doc/log/2026-04-29_session.md -->
```

- Les commentaires HTML sont invisibles au rendu mais parsables.
- L'ordre des marqueurs `from` / `closed` est libre ; les deux peuvent se placer n'importe où sur la ligne.
- Parser : `lib/todo-flat.js` (`parseFlatTodos`, `validateFlatTodos`, `setMarkers`).

Le format fichier (`doc/todo/*.md`) reste opt-in pour les TODOs qui ont besoin d'un vrai subject/brief/contexte. Les deux formats coexistent ; la règle from/closed est identique.

### Purge — manuelle, archivage, jamais de suppression

`openclew status` rapporte les compteurs en attente/faits et **signale** les éléments `[x]` terminés depuis plus de **7 jours** (seuil calculé sur la date de complétion `(YYYY-MM-DD)`). Il ne fait que signaler — la purge est une action **manuelle** délibérée, jamais automatique.

Lors d'une purge, **déplacer** chaque ligne périmée vers un fichier d'archive au lieu de la supprimer — même principe de pierre tombale que pour les refs `Archived`, afin que les références entrantes restent résolubles. L'archive regroupe les entrées en sections datées et conserve chaque ligne **telle quelle** (case à cocher, date, marqueurs `from`/`closed` intacts) :

```markdown
### Purge YYYY-MM-DD
- [x] **Done title** : Description (2026-04-29). <!-- from: ... --> <!-- closed: ... -->
```

Le **nom du fichier d'archive est au choix du consommateur** (openclew est agnostique de l'outil), par exemple `doc/claude_purge.md` ; openclew fixe la *forme*, pas le chemin.

## Champs de la ligne 1

| Champ | Ref | Log | TODO | Description |
|-------|:------:|:---:|:----:|-------------|
| `clw_ref@` / `clw_log@` / `clw_todo@VERSION` | oui | oui | oui | **Version du format openclew** à laquelle le doc se conforme. Immuable sauf migration de format. Ne **pas** incrémenter lors d'une édition de contenu. |
| `created` | oui | — | oui | Date de création |
| `updated` | oui | — | — | Date de dernière mise à jour |
| `reviewed` | oui | — | — | **Date de relecture confirmée**, sans modification. Remet à zéro l'âge vu par `openclew review` (la ref sort du score pendant 90 jours) sans toucher `updated` ni `doc_version`. Optionnel. |
| `doc_version` | oui | — | — | **Version du contenu du document** (semver). Incrémenter lors d'éditions significatives. Commence à `1.0.0`. Distincte de `clw_ref@`. |
| `date` | — | oui | — | Date de la session |
| `type` | oui | oui | — | Type de document |
| `status` | oui | oui | oui | Statut du document |
| `priority` | — | — | oui | Urgence du TODO (Low / Normal / High) |
| `category` | oui | oui | oui | Domaine principal (texte libre) |
| `keywords` | oui | oui | oui | Tags pour la recherche (séparés par des virgules) |

## Types

| Type | Usage |
|------|-------|
| `Reference` | Connaissance durable (architecture, conventions, décisions) |
| `Architecture` | Document de conception structurelle |
| `Guide` | Mode d'emploi, onboarding, explication de processus |
| `Analysis` | Investigation, comparaison, étude |
| `Bug` | Investigation et correction de bug |
| `Feature` | Nouvelle fonctionnalité |
| `Refactor` | Restructuration du code |
| `Doc` | Changement de documentation uniquement |
| `Deploy` | Déploiement ou release |

## Statuts

| Statut | Ref | Log | TODO | Description |
|--------|:------:|:---:|:----:|-------------|
| `Active` | oui | — | — | Document vivant, activement maintenu |
| `Stable` | oui | — | — | Mature, rarement mis à jour |
| `Archived` | oui | — | — | Plus pertinent, conservé pour l'historique |
| `Open` | — | — | oui | TODO non commencé |
| `In progress` | — | oui | oui | Travail en cours |
| `Blocked` | — | — | oui | TODO en attente d'une entrée externe |
| `Done` | — | oui | oui | Travail terminé |
| `Abandoned` | — | oui | — | Travail arrêté, approche non viable |

## Comportement du parser (`lib/search.js`)

1. `parseMetadataLine()` : lit la ligne 1, reconnaît le préfixe (`clw_ref@`, `clw_log@`, `clw_todo@`, `openclew@`), découpe sur ` · `, parse les paires `key: value`
2. `findL1Block()` : repli à 3 niveaux — div → marqueurs en commentaire → positionnel (entre la ligne 1 et le premier `---`)
3. `parseL1()` : une regex extrait `**subject:**` et `**doc_brief:**` du bloc L1
4. Repli legacy : si aucun `**subject:**` n'est trouvé, essaie des lignes `key: value` simples

## Relation aux templates

| Source | Rôle |
|--------|------|
| `templates/FORMAT.md` | **SSOT** — spécification canonique (ce fichier) |
| `templates/ref.md` | Template pour `openclew add ref` |
| `templates/log.md` | Template pour `openclew add log` |
| `templates/todo.md` | Template pour `openclew add todo` (aussi `/oc-todo`) |
| `lib/templates.js` | Templates embarqués (CLI autonome, sans lecture du système de fichiers) |

Ce document (`doc/ref/FORMAT.md`) est une ref **sur** le format, écrite **dans** le format — dogfooding.

---

## Changelog

| Date | Changement |
|------|------------|
| 2026-10-13 | Traduction en français |
| 2026-10-19 | Champ `reviewed` (relecture confirmée, lu par `openclew review`) |
