clw_log@0.9.1 · date: 2026-04-29 · type: Feature · status: Done · category: Format · keywords: [todo, from, closed, flat, traceability, status]

- **subject:** Traçabilité entrée/sortie étendue au TODO.md plat, marqueurs renommés en from/closed
- **doc_brief:** Les lignes du `TODO.md` plat portent désormais des commentaires HTML `<!-- from: ... -->` et `<!-- closed: ... -->`. Les deux sont requis : `from` toujours, `closed` quand la case est cochée. Texte libre accepté. Parser dans `lib/todo-flat.js`. `openclew status` avertit sur les marqueurs manquants. `oc-checkout`, `oc-todo`, FORMAT.md, les templates et le parser `lib/search.js` sont tous alignés. Les champs L1 legacy `entry_log`/`exit_log` (format fichier) sont renommés en `from`/`closed` pour un seul nom partout.
- **related_docs:** doc/ref/FORMAT.md, doc/log/2026-04-27_todo-entry-exit-context.md
- **targets_todos:** TODO.md line 17 (TODOs ↔ sessions: lien manquant dans les deux sens — flat-format extension + naming pass)

---

# Summary

## Objectif

Le travail du 2026-04-27 a ajouté les champs `entry_log` / `exit_log` / `targets_todos`, mais uniquement sur le format fichier (`doc/todo/*.md`). Personne n'utilise ce format — les projets utilisateurs observés (et openclew lui-même) gardent un `TODO.md` plat à la racine. La règle de traçabilité n'était pas appliquée sur le format réellement utilisé.

Cette session fait deux choses :
1. Étend la règle au `TODO.md` plat via des marqueurs en commentaire HTML en ligne.
2. Renomme les marqueurs / champs L1 de `entry_log` / `exit_log` en **`from`** / **`closed`** (plus courts, plus naturels à lire).

## Décision

| Champ | Quand requis |
|---|---|
| `from`   | **Toujours** — à la création. Texte libre accepté. |
| `closed` | **Quand coché** (`- [x]`). Texte libre accepté. |

`openclew status` avertit sur tout TODO sans `from`, et sur tout TODO fermé sans `closed`. Aucune omission silencieuse.

## Changements

| Composant | Changement |
|---|---|
| `lib/todo-flat.js` (nouveau) | Parser, validateur, éditeur de marqueurs pour le TODO.md plat (regex `from` / `closed`, `validateFlatTodos`, `setMarkers`) |
| `lib/status.js` | Remplace les stats regex basiques par les avertissements `parseFlatTodos` + `validateFlatTodos` ; la vérification du format fichier est renommée en `closed` / `from` |
| `lib/search.js` | `parseL1` lit `**from:**` / `**closed:**` (remplace `entry_log` / `exit_log`) |
| `lib/templates.js` + `templates/todo.md` | Nouveaux champs L1 `from:` / `closed:` |
| `commands/oc-checkout.md` | Phase 3bis réécrite : gère le TODO.md plat en priorité, le format fichier en second, nouveau nommage |
| `commands/oc-todo.md` + `skills/oc-todo/SKILL.md` | Documente le plat comme défaut, le fichier comme opt-in, la règle `from` / `closed` |
| `doc/ref/FORMAT.md` | doc_version 1.2.0 → 1.3.0. Documente le balisage plat, passe d'optionnel à requis, nouveau nommage avec note legacy |

## Balisage

```markdown
- [ ] **Title** : Description. <!-- from: doc/log/2026-04-26_audit.md -->
- [ ] **Cold** : Description. <!-- from: 2026-04-29 — cold idea -->
- [x] **Done** : Description (2026-04-29). <!-- from: doc/log/2026-04-26_audit.md --> <!-- closed: doc/log/2026-04-29_session.md -->
```

Commentaires HTML — invisibles au rendu, parsables. L'ordre des marqueurs est libre.

---

# Details

## Pourquoi `from` / `closed`

L'ancien nommage était `entry_log` / `exit_log`. Deux problèmes :
- Le suffixe `_log` est trompeur — la valeur peut être une référence en texte libre, pas toujours un chemin de log.
- `entry` / `exit` sont abstraits ; `from` / `closed` se lisent plus naturellement en contexte : « d'où », « fermé dans ».

`closed` couvre `Done` et `Abandoned` de façon cohérente (`done_log` aurait été trop étroit). Les anciens noms de champs ne sont plus parsés — les projets ayant des lignes `entry_log:` / `exit_log:` existantes doivent faire un renommage ponctuel. `openclew migrate` ne gère pas encore ce cas ; un sed manuel est simple.

## Pourquoi passer à requis

La spec du 2026-04-27 rendait les trois champs optionnels. En pratique, les champs optionnels ne sont pas remplis — l'audit sur un projet réel (44 TODOs) a montré que personne ne s'en donne la peine sans contrainte. Le coût de « toujours requis + texte libre accepté » est quasi nul (une courte chaîne), la valeur est élevée (chaque TODO fermé pointe vers la session qui l'a fermé).

Le texte libre est la soupape de sécurité : les idées à froid n'ont pas besoin d'un chemin de doc, juste d'une date ou d'une explication.

## Test

`openclew status` lancé sur `openclew/TODO.md` lui-même :

```
TODO.md: 14 pending, 5 done
  19 TODO(s) missing from marker
  5 done TODO(s) missing closed marker
```

Cohérent — balisage pas encore appliqué aux 19 lignes existantes. Migration de ces lignes = travail de fond, pas inclus dans cette session (on ne force pas la migration en masse, c'est la même politique que pour le format openclew).

Cas limites testés en isolation :
- `from` à froid (texte libre) → parsé correctement
- Done avec les deux marqueurs → aucun avertissement
- Done sans closed → signalé
- TODO nu (sans marqueurs) → signalé pour from manquant
- `setMarkers` ajout / remplacement / ajout de closed à la fermeture → tout OK

## Lien bidirectionnel

Quand la phase TODO d'`oc-checkout` ferme un TODO :
1. Cocher la case (`- [ ]` → `- [x]`)
2. Ajouter `<!-- closed: <session log path> -->`
3. Compléter `<!-- from: ... -->` s'il manque
4. Dans le L1 du log de session, ajouter la référence du TODO (numéro de ligne ou slug) à `targets_todos:`

Chaque direction doit mener à l'autre.

## Points ouverts

- Pas de migration automatique des TODOs existants (marqueurs simplement absents → status avertit jusqu'à ce qu'ils soient remplis)
- Pas de migration automatique des champs L1 legacy `entry_log` / `exit_log` dans `doc/todo/*.md` (openclew n'en a aucun pour l'instant ; on peut laisser en l'état)
- Port Rust non mis à jour (commande status pas encore portée)
- `setMarkers` pas encore branché dans l'automatisation d'`oc-checkout` — la slash command demande à l'agent de le faire manuellement pour l'instant
