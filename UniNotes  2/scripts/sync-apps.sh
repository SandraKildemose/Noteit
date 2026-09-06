#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILES=(app.js index.html styles.css sw.js version.json manifest.json)
ASSETS=(assets)
APPLE_SILICON_APP="$ROOT/apps/apple-silicon/Note'it.app"
INTEL_APP="$ROOT/apps/intel/Note'it Intel.app"

sync_bundle() {
  local bundle="$1"
  local res="$bundle/Contents/Resources"
  echo "→ $bundle"
  for f in "${FILES[@]}"; do
    cp "$ROOT/$f" "$res/$f"
  done
  for d in "${ASSETS[@]}"; do
    mkdir -p "$res/$d"
    cp -R "$ROOT/$d/." "$res/$d/"
  done
}

sync_bundle "$APPLE_SILICON_APP"
sync_bundle "$INTEL_APP"
echo "Synkroniseret build $(grep -o '"build": [0-9]*' "$ROOT/version.json" | grep -o '[0-9]*') til begge .app bundles."
