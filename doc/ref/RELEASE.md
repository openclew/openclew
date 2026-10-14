clw_ref@0.9.1 · created: 2026-04-17 · updated: 2026-10-14 · doc_version: 2.0.0 · type: Reference · status: Active · category: CLI · keywords: [release, version, bump, publish, npm, cargo, cargo-dist, tag, github-release]

- **subject:** Processus de release — bump, build local des binaires (cargo-dist), GitHub Release et npm publiés à la main
- **doc_brief:** Une release d'openclew se fait entièrement en local, sans CI (décision user 2026-10-14) : bump atomique (`scripts/bump.sh`), `dist build` sur chaque OS pour ses binaires, `gh release create vX.Y.Z` avec les archives et les installeurs, puis `npm publish` du paquet généré par cargo-dist une fois les binaires de toutes les plateformes en ligne.

---

# Summary

## Objectif
Des releases reproductibles sans dépendre de GitHub Actions, avec des versions toujours cohérentes entre `package.json`, `rust/Cargo.toml` et `Cargo.lock`.

## Points clés
- La version vit dans `package.json` (SSOT) ; `rust/Cargo.toml` + `Cargo.lock` (racine du workspace) la reflètent. **Toujours** `scripts/bump.sh X.Y.Z` ; le hook pre-commit bloque toute dérive.
- **Aucune CI** : pas de `.github/workflows/`. cargo-dist sert d'outil local (`dist build`), configuré dans `dist-workspace.toml` sans `ci`.
- **Chaque OS construit ses binaires** : Windows ici ; macOS uniquement sur un Mac (SDK Apple) ; Linux via Docker.
- **Tag `vX.Y.Z`** (format attendu par les installeurs cargo-dist, qui téléchargent depuis `releases/download/vX.Y.Z`).
- **npm en dernier** : le paquet npm télécharge le binaire de la plateforme de l'utilisateur ; le publier avant que toutes les archives soient sur la Release casse `npx openclew` sur les plateformes manquantes.

---

# Details

## 1. Bumper la version

```bash
scripts/bump.sh 0.11.1
```

Réécrit `package.json`, `rust/Cargo.toml`, met à jour `Cargo.lock` et vérifie (`check_version_sync.sh`).

Repères semver : **patch** = corrections, doc, flags opt-in ; **minor** = nouvelles commandes ou comportements non cassants ; **major** = CLI cassant, format sans parser rétrocompatible.

## 2. Notes de release

- `CHANGELOG.md` : `## [Unreleased]` → `## [X.Y.Z] — AAAA-MM-JJ`.
- `UPGRADING.md` : section `## Behavior change — oc_X.Y.Z` si les projets existants doivent agir.

Commit : `<type>(<scope>): <description>` (≤ 50 caractères), sans numéro d'issue dans le titre, puis `git push origin main`.

## 3. Construire les artefacts

Prérequis : `cargo install cargo-dist --version 0.32.0 --locked` (version de `dist-workspace.toml`). `dist plan` liste tout ce qui sera produit. Sorties dans `target/distrib/`.

**Construire depuis un checkout propre du tag** (`git worktree add --detach <dossier> vX.Y.Z`) : cargo-dist embarque dans les archives tout fichier racine qui ressemble à une licence ou un README, y compris les fichiers non suivis (ex. une copie `LICENSE 2`). Vérifier les `[misc]` de `dist plan`.

| Où | Commande | Produit |
|---|---|---|
| Windows | `dist build --artifacts=all --target x86_64-pc-windows-msvc` | `openclew-x86_64-pc-windows-msvc.zip` (+ `.sha256`), installeurs `openclew-installer.ps1` / `.sh`, paquet npm `openclew-npm-package.tar.gz` |
| Mac | `dist build --artifacts=local --target aarch64-apple-darwin --target x86_64-apple-darwin` | archives `.tar.xz` macOS (+ `.sha256`) |
| Linux (Docker) | build dans un conteneur Rust, cibles `x86_64-unknown-linux-gnu` et `aarch64-unknown-linux-gnu` | archives `.tar.xz` Linux (+ `.sha256`) |

## 4. Publier la GitHub Release

```bash
# première machine : crée le tag et la Release
gh release create vX.Y.Z --title "oc_X.Y.Z" --notes-file <notes> target/distrib/openclew-x86_64-pc-windows-msvc.zip target/distrib/openclew-x86_64-pc-windows-msvc.zip.sha256 target/distrib/openclew-installer.ps1
# autres machines : ajoutent leurs archives
gh release upload vX.Y.Z target/distrib/openclew-<cible>.tar.xz target/distrib/openclew-<cible>.tar.xz.sha256
```

`openclew-installer.sh` (macOS/Linux) s'ajoute quand les archives macOS et Linux sont en ligne.

## 5. Publier sur npm (en dernier)

Une fois les 5 archives sur la Release :

```bash
npm publish target/distrib/openclew-npm-package.tar.gz
```

Login npm + validation 2FA dans le navigateur. Vérifier : `npm view openclew version`, puis `npx openclew@X.Y.Z --version` sur un autre OS.

## 6. Canaux d'installation

| Canal | Commande |
|---|---|
| Script (Windows) | `powershell -ExecutionPolicy Bypass -c "irm https://github.com/openclew/openclew/releases/latest/download/openclew-installer.ps1 \| iex"` |
| Script (macOS/Linux) | `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/openclew/openclew/releases/latest/download/openclew-installer.sh \| sh` |
| npm | `npm install -g openclew` ou `npx openclew` |
| Manuel | archive de la plateforme sur la page GitHub Releases |

À venir : tap Homebrew, bucket Scoop, winget.

## Dépannage

**Le hook bloque le commit avec « Version drift »** → `scripts/bump.sh X.Y.Z`.

**`dist build` refuse une cible** (« Cross-compilation … is not supported ») → construire cette cible sur son OS (macOS sur un Mac, Linux via Docker).

**Archives absentes de `target/distrib/`** → un `.cargo/config.toml` dans un dossier parent redirige `target-dir` ; lancer `CARGO_TARGET_DIR=target dist build …`.

**Binaire x86_64 macOS non testable** sur un Mac Apple Silicon sans Rosetta (retirée de macOS 27) : vérifier au moins `file` (Mach-O x86_64) et le tester sur un Mac Intel si possible.

**`npm publish` refusé** → vérifier `npm whoami` et que la version n'est pas déjà publiée (npm refuse de republier une version).

**Modifier la distribution** (cibles, installeurs) → éditer `dist-workspace.toml`.

---

## Changelog

| Date | Changement |
|------|--------|
| 2026-04-17 | Création initiale — formalise le processus bump/publish après l'incident de dérive Cargo (0.6.0 → 0.9.1, 10 jours sans détection) |
| 2026-10-13 | Traduction en français |
| 2026-10-14 | Binaire Rust via cargo-dist, release entièrement locale (aucune CI), npm publié en dernier ; workspace Cargo à la racine ; Homebrew reporté (log : `doc/log/2026-10-14_release-oc-0-11-0.md`) |
| 2026-10-14 | Build macOS : prérequis cargo-dist, checkout propre du tag, `CARGO_TARGET_DIR`, x86_64 sans Rosetta (log : `doc/log/2026-10-14_binaires-macos-0-11-0.md`) |
