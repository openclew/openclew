#!/bin/bash
# Bump openclew version atomically across package.json + rust/Cargo.toml + rust/Cargo.lock.
# Usage: scripts/bump.sh X.Y.Z
#
# Why: version is duplicated across Node and Rust manifests (SSOT violation).
# This script makes the propagation atomic so the two never drift.

set -e

NEW_VERSION="$1"
if [ -z "$NEW_VERSION" ]; then
    echo "Usage: scripts/bump.sh X.Y.Z"
    exit 1
fi

if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$'; then
    echo "⛔ Invalid semver: $NEW_VERSION"
    exit 1
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# 1. package.json (use npm to preserve JSON formatting; npm version without tag)
node -e "
const fs = require('fs');
const p = require('./package.json');
p.version = '$NEW_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(p, null, 2) + '\n');
"
echo "✓ package.json → $NEW_VERSION"

# 2. rust/Cargo.toml — only the first `version = "..."` line under [package]
if [ -f rust/Cargo.toml ]; then
    awk -v v="$NEW_VERSION" '
        /^\[package\]/ { in_pkg = 1 }
        /^\[/ && !/^\[package\]/ { in_pkg = 0 }
        in_pkg && /^version[[:space:]]*=/ && !bumped {
            print "version = \"" v "\""
            bumped = 1
            next
        }
        { print }
    ' rust/Cargo.toml > rust/Cargo.toml.tmp
    mv rust/Cargo.toml.tmp rust/Cargo.toml
    echo "✓ rust/Cargo.toml → $NEW_VERSION"

    # 3. rust/Cargo.lock — regenerate the openclew entry
    if [ -f rust/Cargo.lock ]; then
        (cd rust && cargo update -p openclew --precise "$NEW_VERSION" 2>/dev/null \
            || cargo build --offline --quiet 2>/dev/null \
            || cargo build --quiet 2>/dev/null || true)
        echo "✓ rust/Cargo.lock"
    fi
fi

# 4. Verify
bash scripts/check_version_sync.sh

echo ""
echo "Next: git add package.json rust/Cargo.toml rust/Cargo.lock && git commit"
