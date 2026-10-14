clw_log@0.11.0 · date: 2026-10-14 · type: Feature · status: Done · category: Release · keywords: [release, 0.11.0, rust, binary, cargo-dist, macos, aarch64, x86_64, draft]

- **subject:** Binaires macOS 0.11.0 construits sur Mac et déposés dans une release brouillon
- **doc_brief:** Les archives macOS arm64 et x64 de la 0.11.0 sont construites sur un Mac avec cargo-dist 0.32.0 depuis un checkout propre du tag `v0.11.0`, puis déposées dans la release brouillon `macos-staging-v0.11.0` pour que le mainteneur les publie sur `v0.11.0`. Le paquet npm n'est pas publié : la Release ne contient pas encore macOS ni Linux.
- **targets_todos:** Distribution binaire Rust

---

# Summary

## Objective
Fournir les binaires macOS manquants de la 0.11.0, que Windows ne peut pas produire (pas de cross-compilation vers macOS).

## Solution
- cargo-dist 0.32.0 installé sur le Mac (`cargo install cargo-dist --version 0.32.0 --locked`).
- Build depuis un worktree détaché sur `v0.11.0` (ae7c39f) : `dist build --artifacts=local --target aarch64-apple-darwin --target x86_64-apple-darwin`.
- Archives et `.sha256` déposés dans une release **brouillon** (`macos-staging-v0.11.0`, aucun tag poussé) : la publication sur `v0.11.0` reste au mainteneur.

---

# Details

## Pièges rencontrés

| Piège | Effet | Parade |
|---|---|---|
| Fichier non suivi `LICENSE 2` à la racine du checkout de travail | `dist plan` l'ajoutait dans toutes les archives | Build depuis un checkout propre du tag |
| `.cargo/config.toml` dans un dossier parent (`target-dir` partagé) | Binaires hors de `target/` | `CARGO_TARGET_DIR=<checkout>/target` |
| Mac hôte Apple Silicon sans Rosetta | Binaire x86_64 non exécutable | Vérifié par `file` seulement |

## Vérifications

- `cargo test` 27/27, `npm test` 79/79 (parité Node/Rust) sur `main` (1648345, code Rust identique au tag).
- `shasum -a 256 -c` OK pour les deux archives ; contenu : `openclew`, `README.md`, `CHANGELOG.md`, `LICENSE`.
- Archive arm64 extraite : `openclew 0.11.0 (rust)`. Archive x86_64 : `Mach-O 64-bit executable x86_64`, non exécutée.

## Non fait, volontairement

- Upload sur `v0.11.0`, `openclew-installer.sh`, `npm publish` : ordre imposé par [RELEASE.md](../ref/RELEASE.md) (npm en dernier, sinon `npx openclew` casse sur les plateformes absentes de la Release).

Refs : [RELEASE.md](../ref/RELEASE.md), [RUST_PORT.md](../ref/RUST_PORT.md).
