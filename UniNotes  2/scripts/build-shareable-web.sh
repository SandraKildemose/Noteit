#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$(grep -o '"build": [0-9]*' "$ROOT/version.json" | grep -o '[0-9]*')"
STAMP="$(date -u +%Y%m%d%H%M%S)"
OUT="$ROOT/dist/noteit-web"
ZIP="$ROOT/website/downloads/Noteit-web-iPad-PWA-build-$BUILD.zip"

rm -rf "$OUT"
mkdir -p "$OUT/assets" "$ROOT/website/downloads"

cp "$ROOT/app.js" "$OUT/app.js"
cp "$ROOT/styles.css" "$OUT/styles.css"
cp "$ROOT/sw.js" "$OUT/sw.js"
cp "$ROOT/manifest.json" "$OUT/manifest.json"
cp "$ROOT/version.json" "$OUT/version.json"
cp "$ROOT/_headers" "$OUT/_headers"
cp "$ROOT/netlify.toml" "$OUT/netlify.toml"
cp -R "$ROOT/assets/." "$OUT/assets/"

sed "s/__BUILD__/$BUILD/g;s/__STAMP__/$STAMP/g" "$ROOT/index.html" > "$OUT/index.html"

cat > "$OUT/README-DELING.md" <<README
# Note'it web/iPad PWA

Denne mappe er en delbar webversion af Note'it build $BUILD.

## Brug på iPad
1. Upload mappen til Netlify, Vercel, Cloudflare Pages eller en almindelig HTTPS-server.
2. Åbn URL'en i Safari på iPad.
3. Vælg Del -> Føj til hjemmeskærm.
4. Brug Apple Pencil direkte i noter med Scribble eller i Apple Pencil-tilstand i sidepanelet.

## Brug på en anden computer
Upload hele mappen til en HTTPS-host, eller zip mappen og send den til en anden computer.
Appen kan også åbnes lokalt via index.html, men PWA-installation, mikrofon og service worker virker bedst via HTTPS.

## Privat distribution
Filerne er ikke udgivet som open source. Du må dele denne pakke privat med personer, der skal bruge Note'it.
README

cat > "$OUT/LICENSE-NOTICE.txt" <<NOTICE
Note'it proprietary distribution build $BUILD.
Copyright reserved. This package is provided for private use and testing.
It is not licensed as open source.
NOTICE

(cd "$OUT" && zip -qr "$ZIP" .)
echo "$ZIP"
