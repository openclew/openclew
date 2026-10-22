clw_ref@0.10.1 · created: 2026-10-19 · updated: 2026-10-21 · doc_version: 2.0.0 · type: Architecture · status: Active · category: Format · keywords: [péremption, nettoyage, refs, archive, superseded_by, tombstone, review, apply, journal, checkout, reviewed, chemins morts, redirection]

- **subject:** Péremption des refs — mécanisme de nettoyage continu
- **doc_brief:** Les refs s'accumulaient et rien ne les sortait. `openclew review` les nettoie désormais en continu, sans décision de l'utilisateur. À chaque `checkout`, une passe déterministe rafraîchit les chemins dont le déplacement est prouvé et archive sur place les redirections dont la cible existe, dans un commit dédié. L'agent applique ensuite 1 à 3 gestes jugés (archiver, fusionner, confirmer). Rien n'est jamais supprimé ni déplacé, et chaque geste est journalisé.
- **related_docs:** [doc/log/2026-10-19_peremption-des-refs.md, doc/ref/CLI.md, doc/ref/FORMAT.md]

---

# Summary

## Objectif
Donner aux refs un cycle de sortie qui tourne seul, au rythme des sessions, sans que l'utilisateur valide des listes ref par ref.

## Points clés
- **Deux étages** : des gestes **déterministes**, appliqués par le script (`review --apply`) ; des gestes **jugés**, appliqués par l'agent au `checkout`, 1 à 3 par session (`review --archive|--confirm`).
- **Déclencheur unique : `checkout`**. Pas de pre-commit : trop lent sur un gros dépôt, et il mélangerait le nettoyage au commit de l'utilisateur.
- **Garde-fous** : jamais de suppression ni de déplacement. Les refs avec des changements non commités sont ignorées. Le commit dédié ne contient que les fichiers touchés, et le journal `doc/review-journal.md` trace chaque geste (date, auteur, geste, raison).
- **Une preuve ou rien** : un chemin n'est réécrit que si le déplacement est prouvé. Un simple homonyme ailleurs ne suffit pas : c'est l'erreur du premier tir réel (§ 4).
- **Premier passage réel** (dépôt de 94 refs) : 47 gestes automatiques (42 chemins, 5 redirections archivées), aucun faux positif à la relecture du diff ; restent 17 candidates pour l'agent.

---

# Details

## 1. Mécanisme

| Étage | Qui | Quand | Gestes | Sortie |
|---|---|---|---|---|
| Déterministe | Script `openclew review --apply --commit` | Chaque `checkout` | Rafraîchir un chemin mort ; archiver une redirection prouvée | Commit dédié `docs(review): N automatic cleanup gesture(s)` + journal |
| Jugé | Agent | Chaque `checkout`, 1 à 3 gestes | Confirmer (`reviewed:`), archiver, fusionner | Une ligne par geste dans le rapport de session + journal |
| Détection | Script `openclew review` | À la demande, et top 3 au `checkout` | Aucun (lecture seule) | Markdown top N ou `--json` |

L'utilisateur n'intervient que si l'agent a un doute réel. Sinon il voit des lignes dans le rapport de session et un commit annulable.

### 1.1 Gestes déterministes (`--apply`)

| Geste | Condition (toutes requises) | Écriture |
|---|---|---|
| **Rafraîchir** | Chemin entre backticks introuvable. **Une seule** correspondance prouvée : un fichier dont le chemin **se termine par le chemin cité** (cité relativement à un sous-dossier), ou une migration legacy `<dir>/_NOM.md` → `<dir>/ref/.../NOM.md` | Le chemin cité est remplacé dans la ref. `updated` n'est **pas** modifié : corriger un lien n'est pas revalider le contenu |
| **Archiver** | Ref marquée dépréciée ou redirection (statut, `type`, ou premier mot du `subject`/`doc_brief`) **et** remplaçant prouvé : ref citée de même nom (au `_` près) qui existe, ou unique ref existante citée dans le L1 | `status: Archived` + `superseded_by:` sur place, en ligne 1 (`clw_ref@`/`openclew@`) ou dans le bloc L1 legacy `key: value`. Autre mise en page : rien n'est écrit, la ref remonte à l'agent |

Résolution d'un chemin : depuis le projet, le dossier de la ref, ou un projet voisin (dossier parent) quand le premier segment du chemin y nomme un dossier. Dossiers ignorés : cachés, build, vendorisés (`node_modules`, `target`, `venv`, `site-packages`…), SSOT `templates/embedded/review.json`.

### 1.2 Gestes jugés (agent, au `checkout`)

Le `checkout` affiche les 3 premières candidates avec la consigne : lire **seulement le L1** de chacune, appliquer les gestes dont on est sûr, signaler chacun en une ligne, ne poser une question qu'en cas de doute réel.

```bash
openclew review --confirm <ref> --why "<raison>"                        # toujours vrai : reviewed: <date>
openclew review --archive <ref> [--superseded-by <ref>] --why "<raison>"
```

Fusionner = reporter à la main le contenu utile dans l'autre ref, puis `--archive` avec `--superseded-by`. `--why` est obligatoire, car la raison va au journal. La ref passée à `--superseded-by` doit exister.

### 1.3 Détection et score (`review`)

Candidate = ref **marquée dépréciée** (quel que soit son âge), ou ref **non touchée depuis plus de 90 jours** qui présente au moins un signal. L'âge part de la date la plus récente entre le dernier commit git, `updated`, `created` et `reviewed`.

| Signal | Définition | Poids |
|---|---|---:|
| `deprecated` | Formulation dépréciée ou redirection, sans remplaçant prouvé | 3 |
| `orphan` | Au plus 1 fichier du projet cite son nom (journal et index exclus) | 2 |
| `transient` | `Draft`, `WIP`, `Planned`, `In progress` resté figé | 2 |
| `twin` | Même `subject` normalisé qu'une autre ref | 2 |
| `dead_paths` | Chemins cités introuvables (le plus bruité) | 1 |

Exclues : `status: Archived` (ou `Archivé`), refs rangées dans un dossier `archive/`. Tri : score, puis âge. Seuils et poids : `templates/embedded/review.json`, partagé par Node et Rust.

### 1.4 Garde-fous

- **Jamais de suppression ni de déplacement** : archiver = changer le statut sur place, la ref devient une pierre tombale (format, § Ref status transitions).
- **Refs sales ignorées** : une ref modifiée, indexée ou non suivie n'est jamais touchée par `--apply`.
- **Commit dédié** : `--commit` n'ajoute que les refs touchées et le journal (`git commit --only`). Annulation : `git revert <sha>`. Titre accordé en nombre, en anglais par défaut, remplaçable par projet (`.openclew.json`, clé `reviewCommit`, formes `one` et `many`) pour suivre la convention de commit du projet.
- **Journal** `doc/review-journal.md` : tableau en ajout seul (date, `auto`/`agent`, ref, geste, raison). Il est exclu du comptage des liens entrants : citer une ref dans le journal ne la rend pas « liée ».
- **Idempotence** : une seconde passe ne fait rien.

## 2. Déclencheur : le `checkout`

| Option | Verdict | Raison mesurée |
|---|---|---|
| Pre-commit | Non | 1.7 s par commit sur un dépôt de 94 refs, 8.4 s sur un dépôt de 385 refs (CLI Node). Un hook qui réécrit des fichiers mêlerait le nettoyage au commit de l'utilisateur, alors que le geste doit être isolé et annulable |
| Cron / démon | Non | Infrastructure par machine ; une ref ne vieillit utilement que si quelqu'un travaille sur le projet, c'est-à-dire en session |
| `checkout` | **Oui** | Fin de chaque session : rythme naturel, coût payé une fois, commit dédié possible, et l'agent est là pour les gestes jugés |

Le nettoyage est donc incrémental : quelques gestes par session, jamais une campagne.

## 3. Coût

- Passe déterministe + détection : 1.7 s (94 refs) à 8.4 s (385 refs) côté Node, 0 token.
- Gestes jugés : lecture de 3 L1 (quelques centaines de tokens) et 1 à 3 commandes.
- Sans candidate ni geste : aucune ligne affichée, zéro token.

## 4. Exemple : premier passage réel (2026-10-19)

Mesure initiale sur trois dépôts (564 refs) :
- `Archived` utilisé 7 fois ;
- 36 % des refs non touchées depuis 60 jours ;
- `updated` absent sur 20 % des refs, et en retard de plus de 14 jours sur git pour 23 % ;
- 13 refs `Draft`, dont 12 figées depuis 97 à 184 jours ;
- l'ancien seuil de `status` (30 jours) signalait 67 % des refs.

Sur un dépôt de 94 refs (déroulé complet : `doc/log/2026-10-19_peremption-des-refs.md`) :

| Tir | Règle de rafraîchissement | Gestes | Verdict |
|---|---|---:|---|
| 1 | Homonyme unique n'importe où | 63 | **Annulé** : faux positifs (un `config.py` d'un autre sous-projet, un fichier de `venv`, un `types.ts` sans rapport) |
| 2 | Déplacement prouvé (suffixe ou `_NOM` → `ref/NOM`) | 47 | Appliqué : 42 chemins, 5 redirections archivées ; diff relu, aucun faux positif ; seconde passe vide |

Après le tir 2, il reste 17 candidates pour l'agent, surtout des refs orphelines anciennes. Le statut `Draft` n'est pas réintroduit dans la spec : une ref s'écrit `Active`, et un `Draft` figé devient un signal `transient`.

## 5. Outils comparables

| Outil | Mécanisme | Repris ici |
|---|---|---|
| Google g3doc (*Software Engineering at Google*, ch. 10) | `freshness: { owner, reviewed }`, relance automatique | `reviewed:` distinct d'`updated` |
| Notion, Guru | Vérification avec échéance | `--confirm` comme geste à part entière |
| Swimm | Docs couplées au code, dérive détectée en CI | Chemins cités vérifiés, rafraîchis quand c'est prouvé |
| PEP, ADR | `Superseded by`, jamais de suppression | `status: Archived` + `superseded_by` |
| lychee, markdown-link-check | Liens morts en CI | Détection mécanique, mais réécriture seulement sur preuve |

## 6. Hors périmètre actuel

- outil MCP `review_candidates` ;
- remplacement de la ligne « Stale refs (30+ days) » de `status` ;
- seuils surchargeables par projet dans `.openclew.json`.

Binaire Rust lancé le 2026-10-21 sur un clone réel du dépôt de 94 refs : `checkout`, `--archive` et `--confirm` rendent les mêmes fichiers, commit et journal que Node (0.56 s contre 1.8 s).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-19 | Création : mesure sur trois dépôts, proposition d'un rapport en lecture seule |
| 2026-10-19 | Lot 1 : `openclew review`, top 3 au `checkout`, champ `reviewed:` |
| 2026-10-19 | Refonte en mécanisme continu : gestes déterministes (`--apply`), gestes jugés de l'agent, journal, déclencheur `checkout` ; premier passage réel |
| 2026-10-21 | Binaire Rust lancé sur un clone réel : sortie identique à Node |
