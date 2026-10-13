clw_ref@0.9.1 · created: 2026-04-17 · updated: 2026-10-13 · type: Reference · status: Active · category: CLI · keywords: [release, version, bump, publish, npm, cargo]

- **subject:** Processus de release — bump de version, build, publication (npm + binaire Rust)
- **doc_brief:** Référence pour produire une nouvelle release d'openclew. Couvre le bump de version atomique (`scripts/bump.sh`), la garde pre-commit contre la dérive de version, et les étapes de publication du package npm (distribution principale actuelle) et du binaire Rust (distribution sans Node prévue une fois la parité atteinte).

---

# Summary

## Objectif
Garder les releases d'openclew reproductibles et les deux manifestes (`package.json` + `rust/Cargo.toml`) synchronisés de façon atomique, afin que les utilisateurs qui installent depuis npm ou depuis un binaire Rust obtiennent toujours des versions cohérentes.

## Points clés
- La version vit dans `package.json` (SSOT). `rust/Cargo.toml` + `rust/Cargo.lock` la reflètent.
- **Toujours** bumper via `scripts/bump.sh X.Y.Z` — ne jamais éditer les manifestes à la main.
- Un hook pre-commit (`scripts/check_version_sync.sh`) bloque tout commit présentant une dérive.
- npm est le canal principal actuel. La distribution du binaire Rust est prévue (voir le TODO « Parité port Rust »).

---

# Details

## 1. Bumper la version

```bash
scripts/bump.sh 0.9.2
```

Ce que fait le script :
- Réécrit `version` dans `package.json`
- Réécrit la ligne `[package] version` dans `rust/Cargo.toml`
- Met à jour `rust/Cargo.lock` (via `cargo update -p openclew --precise`)
- Lance `check_version_sync.sh` pour vérifier

Repères semver :
- **patch** (0.9.1 → 0.9.2) : corrections de bugs, changements de doc uniquement, flags opt-in
- **minor** (0.9.1 → 0.10.0) : nouvelles commandes, nouvelles fonctionnalités, changements de comportement non cassants
- **major** (0.9.1 → 1.0.0) : changements cassants du CLI, changements de format sans parser rétrocompatible

## 2. Reconstruire le binaire Rust (si le code Rust a changé)

```bash
cd rust && cargo build --release
./target/release/openclew --version   # sanity check
```

## 3. Mettre à jour les notes de release

- Ajouter une section dans `UPGRADING.md` sous `## Behavior change — oc_X.Y.Z` (ou `## Vocabulary changes — oc_X.Y.Z` pour les renommages)
- Décrire ce qui a changé, pourquoi, et ce que les projets existants doivent faire (le cas échéant)

## 4. Commiter

```bash
git add package.json rust/Cargo.toml rust/Cargo.lock UPGRADING.md <other files>
git commit -m "@X.Y.Z feat(scope): description"
```

Le hook pre-commit vérifie la synchronisation des versions. S'il échoue, c'est que `scripts/bump.sh` n'a pas été lancé — corriger et recommiter.

Convention du titre de commit : `@X.Y.Z <type>(<scope>): <description>` (≤ 50 caractères), avec les types usuels `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `chore`, `release`, et sans numéro d'issue dans le titre.

## 5. Publier sur npm

```bash
rocpublish   # zsh alias: cd + npm login + npm publish
```

Requiert deux validations dans le navigateur (npm login + OTP 2FA) — comportement normal.

Alternative si l'alias n'est pas disponible :
```bash
npm login
npm publish
```

## 6. Distribution du binaire Rust (pas encore active)

Bloquée par le travail de parité — voir le TODO « Parité port Rust ». Approche prévue :
- `cargo-dist` pour des artefacts de release multi-OS (mac/linux/windows, arm64 + x64)
- GitHub Releases comme canal de distribution
- Installeur `curl -fsSL https://openclew.dev/install.sh | sh`

Jusqu'à la parité : npm est le seul canal supporté.

## Dépannage

**Le hook bloque le commit avec « Version drift »**
→ lancer `scripts/bump.sh X.Y.Z` (même pour corriger une simple coquille ; le hook vérifie chaque commit).

**`cargo update` échoue pendant le bump**
→ le script se rabat sur `cargo build --quiet` pour rafraîchir le fichier lock. Si les deux échouent, lancer `cd rust && cargo build` manuellement et commiter le lock.

**npm publish demande l'OTP deux fois**
→ attendu. npm login et npm publish requièrent chacun une validation 2FA. Utiliser `rocpublish` pour enchaîner les deux.

---

## Changelog

| Date | Changement |
|------|--------|
| 2026-04-17 | Création initiale — formalise le processus bump/publish après l'incident de dérive Cargo (0.6.0 → 0.9.1, 10 jours sans détection) |
| 2026-10-13 | Traduction en français |
