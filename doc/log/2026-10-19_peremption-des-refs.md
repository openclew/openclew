clw_log@0.11.0 · date: 2026-10-19 · type: Feature · status: Done · category: Format · keywords: [péremption, nettoyage, refs, review, apply, journal, checkout, reviewed, superseded_by, faux positifs]

- **subject:** Péremption des refs — `openclew review`, du rapport au nettoyage continu
- **doc_brief:** Les refs s'accumulaient sans aucun geste de sortie. `openclew review` les nettoie maintenant à chaque `checkout`. Une passe déterministe corrige les chemins dont le déplacement est prouvé et archive sur place les redirections dont le remplaçant existe, dans un commit dédié ; l'agent applique ensuite 1 à 3 gestes jugés, tous journalisés. Un premier tir réel avec une règle « homonyme unique » a produit des faux positifs et a été annulé ; la règle « déplacement prouvé » a appliqué 47 gestes sans erreur à la relecture.
- **related_docs:** [doc/ref/PEREMPTION_DES_REFS.md, doc/ref/CLI.md, doc/ref/FORMAT.md]

---

# Summary

## Objective
Prévoir un mécanisme qui sort les refs périmées sans détruire et sans demander à l'utilisateur de valider des listes ref par ref.

## Problem
- Mesure sur trois dépôts (564 refs) : `Archived` utilisé 7 fois, 67 % des refs signalées par l'ancien seuil de `status` (30 jours, sur un champ `updated` absent ou en retard sur git pour 43 % des refs).
- Un premier livrable en lecture seule laissait la décision à l'utilisateur, ref par ref : il ne tournait pas seul.

## Solution
- `openclew review` : score pondéré (`deprecated`, `orphan`, `transient`, `twin`, `dead_paths`), Markdown top N ou `--json`.
- `review --apply [--commit]` : gestes déterministes sur preuve seulement, refs non commitées ignorées, commit dédié limité aux fichiers touchés.
- `review --confirm|--archive --why` : gestes jugés de l'agent.
- Journal `doc/review-journal.md` ; `checkout` enchaîne la passe déterministe puis le top 3.
- Champ `reviewed:` ; titre de commit accordé, surchargeable par projet (`reviewCommit`) ; `init` conserve désormais les clés de `.openclew.json`.

---

# Details

## Déroulé

1. Étude et mesure (lecture seule), puis rapport `review` + top 3 au `checkout`.
2. Retour utilisateur : il faut un **mécanisme**, pas un lot à valider. Refonte en deux étages (déterministe / jugé), journal, déclencheur `checkout`.
3. Premier tir réel sur un dépôt de 94 refs, règle « un seul fichier du même nom n'importe où » : 63 gestes, dont des faux positifs (un `config.py` d'un autre sous-projet, un fichier d'environnement virtuel Python, un `types.ts` sans rapport). Commit local annulé par `git reset --keep`, travail non commité de l'utilisateur intact.
4. Règle durcie : le fichier trouvé doit **se terminer par le chemin cité**, ou suivre la migration legacy `<dir>/_NOM.md` → `<dir>/ref/.../NOM.md`, avec une seule correspondance ; `venv` et `site-packages` ignorés. Second tir : 47 gestes (42 chemins, 5 redirections archivées), diff relu, seconde passe vide.

## Enseignements

- Un homonyme n'est pas une preuve de déplacement : la réécriture automatique exige une correspondance de chemin, pas de nom.
- `updated` ne mesure pas la fraîcheur : l'âge vient du max(commit git, `updated`, `created`, `reviewed`), et un rafraîchissement de lien ne touche pas `updated`.
- Le journal ne doit pas compter comme lien entrant : sinon chaque geste « dé-orpheline » la ref qu'il cite.

## Vérification

- `npm test` : 101 verts ; `cargo test` : 31 verts, dont la parité Node/Rust de `review`, `--apply` et des gestes jugés (golden `test/fixtures/parity/generated.json`).
- Binaire Rust non lancé sur un dépôt réel : parité prouvée sur fixtures seulement.
