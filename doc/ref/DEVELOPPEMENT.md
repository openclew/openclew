clw_ref@0.11.0 · created: 2026-10-14 · updated: 2026-10-14 · doc_version: 1.0.0 · type: Reference · status: Active · category: Projet · keywords: [contribuer, développement, conventions, commandes, tests, parité, langue, versioning, release, pièges]

- **subject:** Développer openclew — commandes, conventions, fichiers clés et pièges (référence des contributeurs et des agents)
- **doc_brief:** Point d'entrée partagé pour travailler sur le dépôt openclew : le binaire Rust est la cible, la CLI Node ne sert plus qu'aux tests de parité ; `npm test && cargo test` remplace toute CI ; les textes générés ont pour SSOT `templates/embedded/` ; la doc est en français et le code en anglais ; la version se bumpe uniquement via `scripts/bump.sh` ; la release est locale (cargo-dist + `gh release`, npm en dernier).

---

# Summary

## Objectif
Donner à tout contributeur (humain ou agent) les règles du dépôt au même endroit, versionnées avec le code. Les fichiers d'instructions locaux (`CLAUDE.md`…) ne sont pas suivis par git : ils renvoient ici.

## Points clés
- **Doc-first** : lire `doc/_INDEX.md` (ou `/oc-peek`) avant d'explorer le code.
- **Cible = binaire Rust** (`rust/`), distribué depuis 0.11.0. La CLI Node (`bin/`, `lib/`) est gardée pour les tests de parité, puis sera retirée.
- **Aucune CI** : `npm test && cargo test` avant chaque commit, en local.
- **Dépôt public** : rien d'interne à une organisation (noms de projets privés, chemins locaux, prénoms) dans les fichiers suivis.
- **Langue** : docs en français, code en anglais (détail ci-dessous).

---

# Details

## Commandes

```bash
npm test && cargo test                         # parité Node ↔ Rust — à lancer avant tout commit
cargo build                                    # binaire de dev : target/debug/openclew
node bin/openclew.js <commande>                # CLI Node (référence de parité)
UPDATE_GOLDEN=1 node --test test/parity.test.js  # régénérer les goldens après un changement voulu
node bin/openclew.js index                     # régénérer doc/_INDEX.md (ne jamais l'éditer à la main)
scripts/bump.sh X.Y.Z                          # bump de version atomique
dist build --artifacts=all --target <triple>   # artefacts de release → target/distrib/ (voir RELEASE.md)
```

## Langue

| Français | Anglais |
|---|---|
| `doc/` (refs, logs, L1/L2/L3, `doc_brief`), `TODO.md` | code, commentaires, README, `templates/`, `commands/`, `skills/`, `prompts/`, messages CLI, CHANGELOG, UPGRADING |

Les headings `# Summary` / `# Details` restent en anglais : le parser s'appuie dessus.

## Conventions

- **Idempotence stricte** : chaque commande se relance sans effet de bord.
- **Entry point unique** dans `.openclew.json` (défaut `AGENTS.md`, insensible à la casse). Détection : `CLAUDE.md`, `.cursorrules`, `.cursor/rules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.windsurf/rules`, `.clinerules`, `AGENTS.md`, `.antigravity/rules.md`, `.gemini/GEMINI.md`, `CONVENTIONS.md`.
- **Injection** entre `<!-- openclew_START -->` et `<!-- openclew_END -->`.
- **Textes générés** : SSOT `templates/embedded/*` (placeholders `{{DATE}}`, `{{VER}}`, `{{TITLE}}`…), lus par `lib/templates.js` et embarqués en Rust par `include_str!`. Ne jamais réécrire un texte de template dans le code.
- **Parité Node ↔ Rust** : goldens `test/fixtures/parity/*.json`, vérifiés par `node --test` et `cargo test`. Rust ne modifie jamais un golden : on le régénère côté Node, Rust doit suivre.
- **Format des docs** : SSOT `templates/FORMAT.md` ; marqueurs `clw_ref@` / `clw_log@` ; parser rétrocompatible.
- **Dogfooding** : openclew documente openclew dans `doc/`. Logs immuables, `doc_brief` obligatoire (assertion, pas narration), refs reliées à leurs logs.
- **Proactivité** : c'est l'agent (via le bloc injecté, les commandes, les messages de `status`) qui suggère les actions ; toute fonctionnalité doit être découvrable par ces voies.
- **Frictions publiques** du format ou de l'outil → GitHub Issues (`/oc-raise`).

## Versioning et release

- Préfixe de version `oc_` dans la doc ; tags git `vX.Y.Z`.
- SSOT : `package.json` → `version`. `scripts/bump.sh X.Y.Z` met à jour `package.json`, `rust/Cargo.toml` et `Cargo.lock` ; le hook pre-commit (`git config core.hooksPath .githooks`) bloque toute dérive.
- Release locale : [RELEASE.md](RELEASE.md).

## Fichiers clés

| Fichier / domaine | Rôle |
|---|---|
| `rust/src/main.rs`, `rust/src/cmd/`, `rust/src/parse/` | Binaire : dispatch CLI, commandes, parsers (voir [RUST_PORT.md](RUST_PORT.md)) |
| `bin/openclew.js`, `lib/` | CLI Node de référence pour la parité |
| `templates/embedded/` | SSOT des textes générés (refs, logs, todos, guide, bloc injecté, hook, messages) |
| `templates/FORMAT.md` | SSOT du format de doc |
| `commands/oc-*.md`, `skills/oc-*/`, `prompts/` | Slash commands, skills et prompts installés par `init` (voir [BLOC_INJECTE.md](BLOC_INJECTE.md)) |
| `test/fixtures/parity/` | Fixtures et goldens de parité |
| `Cargo.toml` (racine), `dist-workspace.toml` | Workspace Cargo et configuration cargo-dist |
| `scripts/bump.sh`, `scripts/check_version_sync.sh`, `.githooks/` | Version et garde pre-commit |
| `UPGRADING.md`, `CHANGELOG.md` | Guide de mise à niveau et notes de version |

## Pièges

| Piège | Solution |
|---|---|
| npm publié avant les archives de tous les OS | Casse `npx openclew` sur les OS manquants · [RELEASE.md](RELEASE.md) |
| Version désynchronisée `package.json` ↔ `Cargo.toml` | `scripts/bump.sh X.Y.Z` ; activer le hook : `git config core.hooksPath .githooks` |
| Savoir quelle implémentation tourne | `openclew --version` → `(node)` ou `(rust)` |
| Ancien hook pre-commit qui appelle Python | `init` supprime `doc/generate-index.py` legacy |
| Écrire avec des outils shell sous Windows | Les accents peuvent être corrompus (mojibake) : relire le diff des fichiers non ASCII |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-14 | Création : règles de dépôt rapatriées depuis un fichier d'instructions local non suivi (log : `doc/log/2026-10-14_release-oc-0-11-0.md`) |
