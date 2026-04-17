clw_ref@0.9.1 · created: 2026-04-17 · updated: 2026-04-17 · type: Reference · status: Active · category: CLI · keywords: [release, version, bump, publish, npm, cargo]

- **subject:** Release process — version bump, build, publish (npm + Rust binary)
- **doc_brief:** Reference for cutting a new openclew release. Covers the atomic version bump (`scripts/bump.sh`), the pre-commit version-drift guard, and the publish steps for both the npm package (current primary distribution) and the Rust binary (planned no-Node distribution once parity is reached).

---

# Summary

## Objective
Keep openclew releases reproducible and the two manifests (`package.json` + `rust/Cargo.toml`) atomically in sync, so users installing from npm or from a Rust binary always get consistent versions.

## Key points
- Version lives in `package.json` (SSOT). `rust/Cargo.toml` + `rust/Cargo.lock` mirror it.
- **Always** bump via `scripts/bump.sh X.Y.Z` — never edit the manifests by hand.
- A pre-commit hook (`scripts/check_version_sync.sh`) blocks any commit with drift.
- npm is the current primary channel. Rust binary distribution is planned (see TODO "Parité port Rust").

---

# Details

## 1. Bump the version

```bash
scripts/bump.sh 0.9.2
```

What it does:
- Rewrites `package.json` `version`
- Rewrites the `[package] version` line in `rust/Cargo.toml`
- Updates `rust/Cargo.lock` (via `cargo update -p openclew --precise`)
- Runs `check_version_sync.sh` to verify

Semver guidance:
- **patch** (0.9.1 → 0.9.2): bug fixes, doc-only changes, opt-in flags
- **minor** (0.9.1 → 0.10.0): new commands, new features, non-breaking behavior changes
- **major** (0.9.1 → 1.0.0): breaking CLI changes, format changes without backward-compat parser

## 2. Rebuild the Rust binary (when Rust code changed)

```bash
cd rust && cargo build --release
./target/release/openclew --version   # sanity check
```

## 3. Update release notes

- Add a section to `UPGRADING.md` under `## Behavior change — oc_X.Y.Z` (or `## Vocabulary changes — oc_X.Y.Z` for renames)
- Describe what changed, why, and what (if anything) existing projects need to do

## 4. Commit

```bash
git add package.json rust/Cargo.toml rust/Cargo.lock UPGRADING.md <other files>
git commit -m "@X.Y.Z feat(scope): description"
```

The pre-commit hook verifies version sync. If it fails, `scripts/bump.sh` was not run — fix and re-commit.

Convention for the commit title: `@X.Y.Z <type>(<scope>): <description>` (≤ 50 chars). See `R.AlphA.Doc/shared/COMMIT_CONVENTION.md`.

## 5. Publish to npm

```bash
rocpublish   # zsh alias: cd + npm login + npm publish
```

Requires two browser validations (npm login + OTP 2FA) — normal behavior.

Alternative if the alias is unavailable:
```bash
npm login
npm publish
```

## 6. Rust binary distribution (not yet active)

Blocked by parity work — see TODO "Parité port Rust". Planned approach:
- `cargo-dist` for multi-OS release artifacts (mac/linux/windows, arm64 + x64)
- GitHub Releases as the distribution channel
- `curl -fsSL https://openclew.dev/install.sh | sh` installer

Until parity: npm is the only supported channel.

## Troubleshooting

**Hook blocks the commit with "Version drift"**
→ run `scripts/bump.sh X.Y.Z` (even if you were only fixing a typo; the hook checks every commit).

**`cargo update` fails during bump**
→ the script falls back to `cargo build --quiet` to refresh the lock file. If both fail, run `cd rust && cargo build` manually and commit the lock.

**npm publish asks for OTP twice**
→ expected. npm login + npm publish each require one 2FA validation. Use `rocpublish` to pipeline both.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | Initial creation — codifies the bump/publish process after Cargo drift incident (0.6.0 → 0.9.1, 10 days undetected) |
