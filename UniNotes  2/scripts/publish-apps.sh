#!/bin/bash
# Synkroniser workspace → begge .app bundles, bump build, genbyg native binary.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APPLE_SILICON_APP="$ROOT/apps/apple-silicon/Note'it.app"
INTEL_APP="$ROOT/apps/intel/Note'it Intel.app"

python3 << 'PY'
import json, re, pathlib, datetime

root = pathlib.Path(".")
version_path = root / "version.json"
version = json.loads(version_path.read_text())
version["build"] = int(version.get("build", 0)) + 1
version["built"] = datetime.date.today().isoformat()
version_path.write_text(json.dumps(version, indent=2) + "\n")

build = str(version["build"])
ver = version.get("version", "2.26.0")

index = (root / "index.html").read_text()
index = re.sub(r'styles\.css\?v=[^"\']+', 'styles.css?v=__BUILD__&t=__STAMP__', index)
index = re.sub(r'app\.js\?v=[^"\']+', 'app.js?v=__BUILD__&t=__STAMP__', index)
index = re.sub(r'<meta name="noteit-build" content="[^"]+">', '<meta name="noteit-build" content="__BUILD__">', index)
index = re.sub(r"window\.__NOTEIT_BUILD__='[^']+'", "window.__NOTEIT_BUILD__='__BUILD__'", index)
index = re.sub(r'>Build \d+<', '>Build __BUILD__<', index)
(root / "index.html").write_text(index)

sw = (root / "sw.js").read_text()
sw = re.sub(r"const CACHE = 'noteit-v\d+'", f"const CACHE = 'noteit-v{build}'", sw)
(root / "sw.js").write_text(sw)

for plist in ["apps/apple-silicon/Note'it.app/Contents/Info.plist", "apps/intel/Note'it Intel.app/Contents/Info.plist"]:
    p = root / plist
    if not p.exists():
        continue
    text = p.read_text()
    text = re.sub(r'(<key>CFBundleShortVersionString</key>\s*<string>)[^<]+', rf'\g<1>{ver}', text)
    text = re.sub(r'(<key>CFBundleVersion</key>\s*<string>)[^<]+', rf'\g<1>{build}', text)
    p.write_text(text)

print(f"Build {build} klar til sync.")
PY

bash "$ROOT/scripts/sync-apps.sh"

echo "Genbygger native apps..."
clang -framework Cocoa -framework WebKit -arch arm64 -o "/tmp/Noted-arm64" "$ROOT/macos/NoteItApp.m"
cp "/tmp/Noted-arm64" "$APPLE_SILICON_APP/Contents/MacOS/Noted"
clang -framework Cocoa -framework WebKit -arch x86_64 -o "/tmp/Noted-intel" "$ROOT/macos/NoteItApp.m"
cp "/tmp/Noted-intel" "$INTEL_APP/Contents/MacOS/Noted"

codesign --force --sign - "$APPLE_SILICON_APP"
codesign --force --sign - "$INTEL_APP"

BUILD=$(python3 -c "import json; print(json.load(open('$ROOT/version.json'))['build'])")
echo ""
echo "✓ Note'it opdateret til build $BUILD"
echo "  Luk appen med Cmd+Q og åbn igen fra apps/apple-silicon eller apps/intel."
