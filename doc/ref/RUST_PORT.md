clw_ref@0.10.1 · created: 2026-10-13 · updated: 2026-10-14 · doc_version: 1.2.0 · type: Reference · status: Active · category: Architecture · keywords: [rust, binary, parity, mcp, distribution, include_str, cargo-dist]

- **subject:** Port Rust d'openclew — binaire standalone sans Node.js
- **doc_brief:** Le binaire Rust (`rust/`) porte toutes les commandes du CLI Node sauf l'update-notifier (`migrate` est désactivée des deux côtés depuis 0.11.0) ; la parité est garantie par des goldens partagés (`test/fixtures/parity/`) vérifiés par `node --test` et `cargo test`, et les textes générés viennent de `templates/embedded/` via `include_str!`. Reste à construire la chaîne de distribution (releases multi-OS, installeurs, gestionnaires de paquets) avant de retirer `lib/`.

---

# Summary

## Objectif
Supprimer le prérequis Node.js. `npx openclew init` échoue sur une machine sans Node (« npx is not recognized » sous Windows ; même après installation de Node, il faut relancer le terminal pour que le PATH soit pris en compte). Un binaire unique = télécharger et exécuter, zéro runtime.

## Points clés
- **Périmètre** : toutes les commandes sauf l'update-notifier ; `migrate` est obsolète et désactivée en Node comme en Rust (renvoi vers `npx openclew@0.9.0 migrate`) (il exigerait un client HTTPS + TLS dans le binaire ; les mises à jour passeront par le gestionnaire de paquets).
- **Parité testée** : mêmes goldens pour Node et Rust (`test/fixtures/parity/`), exécutés en local par `npm test` et `cargo test` (aucune CI depuis le 2026-10-14).
- **SSOT des textes** : `templates/embedded/*.md`, lus par `lib/templates.js` et embarqués dans Rust via `include_str!`. Aucun texte de template n'est réécrit dans le code.
- **Coexistence** : `openclew --version` affiche `(node)` ou `(rust)`. Le hook pre-commit et le bloc injecté appellent `openclew` d'abord, `npx` en repli.
- **Distribution** : cargo-dist depuis 0.11.0 — GitHub Releases, installeurs shell/PowerShell, npm (voir § Distribution et [RELEASE.md](RELEASE.md)).

---

# Details

## Architecture

```
rust/
  Cargo.toml            # profil release : strip + lto + codegen-units = 1
  src/
    main.rs             # dispatch CLI (clap) ; --version = "<ver> (rust)"
    cmd/                # init, add, search, peek, checkout, status, session_header, index, mcp
    parse/              # metadata (ligne 1), l1, collect, search, legacy, todo_flat
    template.rs         # templates embarqués (include_str!) + rendu des placeholders
    detect.rs, inject.rs, config.rs, util.rs
    parity_tests.rs     # tests de parité contre les goldens
```

Dépendances : `clap`, `serde` + `serde_json`, `regex`, `chrono`, `dirs`. Pas de `tokio` : le serveur MCP est synchrone (lecture ligne à ligne sur stdin).

## Commandes portées

| Commande | Rust | Remarque |
|---|---|---|
| `init` (`--hook`, `--no-inject`, `--private-logs`, `--no-commands`) | Oui | Mêmes flags que Node |
| `add ref` / `add log` / `add todo` | Oui | |
| `search`, `peek`, `checkout`, `status` | Oui | |
| `session-header` | Oui | |
| `index` | Oui | Appelé par le hook pre-commit |
| `mcp` | Oui | Voir ci-dessous |
| `migrate` (toutes variantes) | Désactivée | Obsolète depuis 0.11.0 : même message qu'en Node (`templates/embedded/migrate-deprecated.txt`) |
| Update-notifier | **Non** | Pas de client HTTPS dans le binaire |

## Parité Node ↔ Rust

- Fixtures : `test/fixtures/parity/doc/` (refs, logs, todos, formats legacy, `_archive/`) + `TODO.md`.
- Goldens : `expected.json` (`collectDocs` sur le dossier) et `generated.json` (templates, slugs, classement de recherche, niveaux de `read_doc`, session-header, todos plats).
- Côté Node : `test/parity.test.js` produit/vérifie les goldens. Côté Rust : `rust/src/parity_tests.rs` lit les **mêmes** entrées depuis `generated.json` (jamais redéfinies côté Rust).
- Dates et version sont tokenisées (`{{DATE}}`, `{{VER}}`) avant comparaison.
- Changement de comportement voulu : `UPDATE_GOLDEN=1 node --test test/parity.test.js`, puis `cargo test` doit passer sans retouche.

## SSOT des textes générés

`templates/embedded/` contient ref, log, todo, guide, bloc injecté, exemples, log de checkout, intégration framework, hook pre-commit (`pre-commit-index.sh`). `init.rs` embarque aussi `commands/oc-*.md`, `prompts/oc-*.prompt.md` et `templates/openclew-preview.css`.

**Contrainte** : `include_str!` lit des fichiers **hors du crate** (`../../templates/...`). Le crate ne peut donc pas être publié tel quel via `cargo publish` : le build se fait depuis le dépôt complet.

## Serveur MCP (`openclew mcp`)

JSON-RPC sur stdio. 6 tools :

| Tool | Entrées | Rôle |
|---|---|---|
| `search_docs` | `query` | Recherche pondérée, triée par pertinence |
| `read_doc` | `path`, `level` (`L1`/`L2`/`L3`/`full`, défaut `L2`) | Lecture par niveau |
| `list_docs` | `kind` (`ref`/`log`/`todo`, optionnel) | Liste avec métadonnées L1 |
| `create_log` | `title`, `subject?`, `brief?`, `content?` | Log pré-rempli (structure L1/L2/L3) |
| `create_ref` | `title`, `subject?`, `brief?`, `content?` | Ref pré-remplie dans `doc/ref/` |
| `create_todo` | `title` | TODO fichier dans `doc/todo/` avec champs `from`/`closed` |

Les `create_*` économisent des tokens : l'agent envoie quelques champs, le serveur génère le fichier complet au bon format.

**Écart connu** : le serveur MCP Node (`lib/mcp-server.js`) n'expose que les 3 tools de lecture (`search_docs`, `read_doc`, `list_docs`). Les goldens couvrent la logique partagée (recherche, niveaux), pas la liste des tools MCP.

## Distribution (depuis 0.11.0)

Outillée avec cargo-dist en local, sans CI (`dist-workspace.toml`, workspace Cargo à la racine du dépôt) ; processus de release : [RELEASE.md](RELEASE.md).

| Étape | État |
|---|---|
| 1. Releases | Windows x64 publié en 0.11.0 ; macOS arm64/x64 (sur Mac) et Linux x64/arm64 (Docker) à construire et téléverser |
| 2. Installeurs one-liner | Fait : `openclew-installer.sh` (`curl \| sh`), `openclew-installer.ps1` (`irm \| iex`) |
| 3. Paquet npm | Prêt : installeur npm de cargo-dist (construit en local, à publier une fois les 5 archives en ligne), qui télécharge le binaire de la plateforme depuis la GitHub Release (choisi plutôt que le modèle esbuild : zéro code à maintenir ; limite : téléchargement GitHub au moment de l'install) |
| 4. Gestionnaires de paquets | À venir : tap Homebrew, bucket Scoop, winget |
| 5. Retrait de `lib/` | À faire : le paquet npm ne contient plus le code Node, qui ne sert plus qu'aux tests de parité |

Points d'attention :
- Installeurs : binaire placé dans `CARGO_HOME/bin` (`~/.cargo/bin`), ajouté au PATH.
- Signature/notarisation macOS et signature Windows : reportées (le binaire installé par script n'est pas bloqué par Gatekeeper ; une archive téléchargée par navigateur peut l'être).

## Pièges

| Piège | Solution |
|---|---|
| Version désynchronisée `package.json` ↔ `Cargo.toml` | `scripts/bump.sh X.Y.Z` (bump atomique) ; le hook pre-commit bloque la dérive |
| Golden modifié côté Rust seulement | Interdit : les goldens se régénèrent côté Node, Rust doit suivre |
| Savoir quel binaire tourne | `openclew --version` → `(node)` ou `(rust)` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-13 | Création (rapatriée depuis la doc interne) |
| 2026-10-14 | `migrate` désactivée : le binaire couvre tout le CLI |
| 2026-10-14 | Distribution cargo-dist configurée (0.11.0) |
