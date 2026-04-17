#!/bin/bash
# Verify package.json and rust/Cargo.toml declare the same version.
# SSOT: package.json (Node CLI is the reference implementation).
# Fails with non-zero exit if versions drift.

set -e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PKG="$ROOT/package.json"
CARGO="$ROOT/rust/Cargo.toml"

if [ ! -f "$PKG" ]; then
    echo "⚠️  package.json missing — skip"
    exit 0
fi

if [ ! -f "$CARGO" ]; then
    # No Rust port → nothing to sync
    exit 0
fi

PKG_VERSION=$(node -p "require('$PKG').version" 2>/dev/null || \
              grep -E '^\s*"version"' "$PKG" | head -1 | sed -E 's/.*"version"\s*:\s*"([^"]+)".*/\1/')

CARGO_VERSION=$(grep -E '^version\s*=' "$CARGO" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')

if [ "$PKG_VERSION" != "$CARGO_VERSION" ]; then
    echo "⛔ Version drift:"
    echo "   package.json        → $PKG_VERSION"
    echo "   rust/Cargo.toml     → $CARGO_VERSION"
    echo ""
    echo "   Fix: scripts/bump.sh $PKG_VERSION"
    exit 1
fi

exit 0
