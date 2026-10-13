clw_log@0.9.1 · date: 2026-04-27 · type: Feature · status: Done · category: Format · keywords: [todo, entry_log, exit_log, targets_todos, traceability]

- **subject:** Ajout d'entry_log/exit_log aux TODOs et de targets_todos aux logs — traçabilité dans les deux sens
- **doc_brief:** Les TODOs gagnent deux champs L1 optionnels qui les relient au travail environnant — `entry_log` (d'où vient l'idée) et `exit_log` (où elle a été résolue). Les logs gagnent `targets_todos` (sur quels TODOs la session a travaillé). Tous optionnels. `status` avertit sur les TODOs Done sans `exit_log`. `oc-checkout` gagne une phase de balayage des TODOs.
- **related_docs:** doc/ref/FORMAT.md, doc/log/2026-04-17_oc-todo-skill.md
- **targets_todos:** TODO.md line 17 (TODOs ↔ sessions: lien manquant dans les deux sens)

---

# Summary

## Objectif

Les TODOs étaient des îlots. En regardant un TODO, impossible de savoir quelle session l'avait résolu. En regardant un log de session, impossible de savoir quels TODOs elle avait fait avancer. Un audit sur un projet réel (44 TODOs ouverts, ~3 déjà résolus dans le code mais jamais fermés) a rendu le coût concret.

## Solution

Trois champs L1 optionnels, aucun changement cassant :

| Champ | Type de doc | Rôle |
|-------|----------|------|
| `entry_log` | TODO | Log/ref qui a motivé ce TODO. Rempli à la création si un contexte existe |
| `exit_log` | TODO | Chemin de log **ou** référence de session en texte libre. Rempli à la fermeture |
| `targets_todos` | Log | TODOs sur lesquels cette session a travaillé |

Les valeurs d'exit_log en texte libre (`2026-04-27 session — handled inline`) sont acceptées — toute fermeture ne mérite pas un log dédié.

## Changements de comportement

- `lib/templates.js` + `templates/todo.md` + `templates/log.md` : nouveaux champs dans les templates
- `lib/search.js` `parseL1()` : parse les 3 nouveaux champs, retire les commentaires HTML en ligne
- `lib/status.js` : nouvelle section signalant les TODOs `Done` sans `exit_log`
- `commands/oc-todo.md` + `skills/oc-todo/SKILL.md` : consignes pour l'agent sur le remplissage d'entry_log
- `commands/oc-checkout.md` : nouvelle Phase 3bis (balayage des TODOs) — lister les TODOs ouverts, demander à l'utilisateur, écrire exit_log + targets_todos dans les deux sens
- `doc/ref/FORMAT.md` : nouveaux champs documentés, doc_version bumpée 1.1.0 → 1.2.0

---

# Details

## Décisions

- **Optionnel, pas strict** : imposer entry_log à la création casserait les TODOs « idée à froid ». `status` avertit au lieu de bloquer.
- **exit_log en forme libre** : un chemin est l'idéal, mais une courte référence de session suffit quand le travail était incident. Évite d'imposer un log dédié pour des fermetures triviales.
- **Lien bidirectionnel** : quand checkout ferme un TODO, il ajoute le chemin du TODO au `targets_todos` du log ET écrit le chemin du log dans l'`exit_log` du TODO. La symétrie compte — chaque direction doit mener à l'autre.

## Test en isolation

`/tmp/oc-todo-test/` avec deux TODOs en status=Done (un avec exit_log, un sans). `openclew status` a correctement signalé uniquement celui qui en manquait :

```
Done TODOs missing exit_log (1):
  - doc/todo/2026-04-26_done-without-exit.md  (A done todo without exit_log)
```

## Points ouverts

- Port Rust : non mis à jour (la commande status n'est de toute façon pas encore portée)
- Pas de migration automatique des TODOs existants — les champs sont simplement absents (traités comme optionnels)
- La phase TODO d'`oc-checkout` est documentée dans la slash command, mais l'auto-détection (grep des mots-clés du subject des TODOs contre le git diff) est laissée à la discrétion de l'agent
