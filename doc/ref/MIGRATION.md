clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-14 · doc_version: 1.1.0 · type: Reference · status: Active · category: Migration · keywords: [migrate, upgrade, legacy, repoint, todo, status, UPGRADING, clw_ref, clw_log]

- **subject:** Mise à niveau des projets créés avec une ancienne version d'openclew
- **doc_brief:** **Obsolète et désactivée depuis 0.11.0** (non portée en Rust) : `openclew migrate` affiche un renvoi vers `npx openclew@0.9.0 migrate`, dernière version qui la livre ; ce qui suit décrit son comportement dans cette version. `openclew migrate` convertit les docs legacy vers le format courant (`clw_ref@` / `clw_log@`, L1 en liste Markdown, `# Summary` / `# Details`) ; il est en dry-run par défaut, n'écrit qu'avec `--write`, est idempotent et ne touche jamais au corps L2/L3. `--repoint` réécrit les chemins après un déplacement de fichier, `--todo` extrait une section TODO du fichier d'instructions vers `TODO.md`. `status` compte les docs legacy et renvoie vers `migrate`. `UPGRADING.md` est le guide utilisateur ; `migrate` existe seulement dans l'implémentation Node.

---

# Summary

## Objectif
Décrire comment un utilisateur d'une ancienne version passe au format courant sans perdre de contenu, et pourquoi la migration est conçue ainsi. Le format cible est spécifié dans [FORMAT.md](FORMAT.md) ; les notes de version par release vivent dans `UPGRADING.md` à la racine du dépôt.

## Points clés
- **Pourquoi migrer** : les parsers lisent encore les anciens formats, donc rien ne casse. Mais un agent qui crée un doc **imite les docs existants** : tant que le legacy domine, les nouveaux docs naissent legacy. Migrer, c'est donner les bons exemples.
- **Sûr par défaut** : dry-run d'abord, `--write` explicite, revue par `git diff`, idempotent, fichiers déjà au format courant ignorés.
- **Périmètre** : seulement la ligne 1, le bloc L1 et les headings L1/L2/L3. Le contenu, les sous-headings et les liens internes au texte restent tels quels.
- **Trois sous-commandes** : conversion du format (défaut), `--repoint <ancien> <nouveau>` après un déplacement, `--todo` pour sortir les TODO du fichier d'instructions.
- **Node uniquement** : le binaire Rust ne porte pas `migrate` ; ses messages renvoient vers `npx openclew migrate`.

---

# Details

## Parcours de mise à niveau

```bash
npm install -g openclew@latest   # ou npx openclew@latest
openclew init                    # rafraîchit le bloc injecté (règles à jour)
openclew status                  # ligne "Legacy format: N docs need migration"
openclew migrate                 # dry-run : liste les fichiers concernés
openclew migrate --write         # applique
git diff                         # revue
openclew index                   # optionnel : régénère _INDEX.md
```

Re-lancer `init` est important : un ancien bloc injecté peut encore dire aux agents de lire `_INDEX.md` ou de créer les docs à la main. `init` met à jour le bloc entre ses marqueurs sans toucher au reste (voir [INIT.md](INIT.md)).

Vérification finale : `openclew status` n'affiche plus de ligne legacy et `openclew migrate` répond `0 to migrate`.

## Ce qui est considéré comme legacy

`parseLegacyDoc()` (`lib/migrate.js`) classe chaque fichier :

| Cas | Détection | Traitement |
|---|---|---|
| Format courant | ligne 1 commence par `clw_ref@` ou `clw_log@` | Ignoré |
| Semi-legacy | ligne 1 commence par `openclew@` | Simple échange de préfixe vers `clw_ref@` / `clw_log@` selon le type |
| Bloc L1 balisé | `<div class="oc-l1">` ou `<!-- L1_START -->…<!-- L1_END -->` contenant des `key: value` | Reconstruction ligne 1 + L1 |
| YAML frontmatter + bloc L1 | `---` en tête + bloc L1 | Frontmatter fusionné (L1 prioritaire) puis supprimé |
| YAML frontmatter seul | `---` en tête avec un champ `subject` | Frontmatter remplacé par ligne 1 + L1, corps conservé |

Un doc dont le L1 utilise déjà `**subject:**` sans `key: value` en clair n'est pas considéré comme legacy.

## Ce que fait la conversion

- **Ligne 1** reconstruite : `clw_ref@<version>` (refs) avec `created` / `updated`, ou `clw_log@<version>` (logs) avec `date` ; puis `type`, `status`, `category`, `keywords`, et `related_docs` s'il est non vide. La version inscrite est celle du paquet qui migre.
- **Valeurs manquantes** : date absente → `unknown` ; type absent → `Reference` (ref) ou `Feature` (log) ; status absent → `Active` (ref) ou `Done` (log).
- **Mappings** : types et statuts français vers l'anglais (`Vivant`/`Actif` → `Active`, `Terminé` → `Done`, `En cours` → `In progress`, `Archivé` → `Archived`, `Abandonné` → `Abandoned` ; `Référence` → `Reference`, `Fonctionnalité` → `Feature`, `Analyse` → `Analysis`, `Déploiement` → `Deploy`, `Documentation` → `Doc`…). Les emojis en tête de valeur sont retirés. Une valeur inconnue est gardée telle quelle (sans emoji).
- **L1** : `- **subject:** …` et `- **doc_brief:** …` ; `summary` sert de repli pour `doc_brief`.
- **Headings** : la ligne de titre L1 (ex. `# 📋 L1 · Métadonnées`) est supprimée ; le premier heading contenant `L2` devient `# Summary`, celui contenant `L3` devient `# Details`.

## Ce qu'elle ne fait pas

- Le corps L2/L3 et les sous-headings (`## Objectif`, emojis compris) restent intacts.
- `doc_version` n'est pas ajouté à la ligne 1.
- Les fichiers ne sont pas déplacés : passer de `doc/_SUJET.md` à `doc/ref/SUJET.md` est une convention, à appliquer à son rythme.
- `_INDEX.md` n'est pas touché (cache régénérable par `openclew index`).

## Fichiers scannés

Refs : `doc/ref/**/*.md` et `doc/_*.md` (racine et sous-dossiers, hors `log/`, `notes/`, `verify_logs/`). Logs : `doc/log/**/*.md`. Notes : `doc/notes/**/*.md`, traitées comme des logs. Ignorés : `_archive/`, `old/`, `_INDEX.md`, `_INDEX_NOTES.md`.

Sortie : `→ fichier` en dry-run, `✓ fichier` en écriture, `⚠` sur erreur de lecture/écriture, puis `N to migrate, M already current, E errors (T total)` et l'étape suivante.

## `--repoint` : après un déplacement de fichier

```bash
openclew migrate --repoint doc/_AUTH.md doc/ref/AUTH.md          # dry-run
openclew migrate --repoint doc/_AUTH.md doc/ref/AUTH.md --write  # applique
```

Remplace **toutes** les occurrences littérales de l'ancien chemin par le nouveau dans les fichiers scannés (pas seulement `related_docs` : un lien dans le corps est aussi réécrit). Pensé pour que la migration des emplacements ne casse pas les références croisées.

## `--todo` : sortir les TODO du fichier d'instructions

Cherche une section `## TODO` contenant des cases à cocher dans l'entry point (`.openclew.json`, sinon premier fichier d'instructions détecté). En `--write` : crée `TODO.md` (ou y ajoute à la suite) et remplace la section par un pointeur `See [TODO.md](TODO.md)`. Dry-run par défaut, comme le reste. `status` suggère cette commande quand il trouve des cases à cocher dans le fichier d'instructions et pas de `TODO.md`.

## Détection legacy dans `status`

`status` passe chaque doc reconnu par `collectDocs()` dans `parseLegacyDoc()` et affiche `Legacy format: N docs need migration` avec les deux commandes à lancer. Il signale aussi plusieurs binaires `openclew` dans le `PATH` (coexistence Node/Rust) et indique lequel est actif. Les docs sans `doc_brief` (fréquent après migration de très vieux fichiers frontmatter-only) apparaissent dans la section « Missing doc_brief » : à remplir à la main.

## Décisions et corrections passées

| Problème rencontré | Correction |
|---|---|
| `migrate` produisait encore le préfixe `openclew@` | Génère `clw_ref@` / `clw_log@` selon le type de doc |
| Les docs `openclew@` n'étaient pas migrables | Cas semi-legacy : échange de préfixe seul |
| `migrate` absent du paquet npm et du dispatcher | Inclus dans le paquet et listé dans `help --all` |
| Scan limité à `doc/_*.md` racine : `doc/ref/` invisible pour tous les outils | Scan récursif unique (`walkDir` dans `lib/search.js`), partagé par `search`, `status`, `index`, `mcp` et `migrate` |
| Déplacer un fichier cassait les `related_docs` | `--repoint` |
| Deux binaires installés sans moyen de savoir lequel tourne | `--version` affiche `(node)` / `(rust)`, `status` liste les binaires du `PATH` |
| Ancien hook pre-commit appelant un script Python | `init` supprime `doc/generate-index.py` ; le hook appelle `openclew index` (ou `npx`) |
| `status` créait un fichier `nul` sous macOS/Linux | La recherche de binaires dépend de la plateforme ; supprimer un éventuel `nul` résiduel |
| Les anciens blocs injectés demandaient de lire `_INDEX.md` | Re-lancer `init` : `peek` / `list_docs` remplacent l'index pour les agents |

## Pièges connus

| Piège | Conséquence / contournement |
|---|---|
| `doc/notes/` est migré mais ignoré par `collectDocs()` | Le compte legacy de `status` peut être inférieur au total de `migrate` |
| Dates absentes dans le doc source | Ligne 1 avec `unknown` : à corriger à la main après migration |
| `--repoint` remplace partout, pas seulement dans `related_docs` | Vérifier le `git diff` si l'ancien chemin apparaît aussi dans du texte |
| Message de `add ref` suggérant `migrate --move` | Option inexistante : déplacer le fichier puis `--repoint` |
| Utilisateur du binaire Rust seul | `migrate` indisponible : lancer `npx openclew migrate` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (condensé de l'historique interne) |
| 2026-10-14 | `migrate` obsolète et désactivée depuis 0.11.0 ; renvoi vers `npx openclew@0.9.0 migrate` (message SSOT `templates/embedded/migrate-deprecated.txt`) |
