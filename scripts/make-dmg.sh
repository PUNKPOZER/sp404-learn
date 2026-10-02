#!/usr/bin/env bash
# Drag-to-Applications DMG from the built .app (plain hdiutil: no Finder scripting, works headless/CI).
set -euo pipefail
cd "$(dirname "$0")/../src-tauri/target/release/bundle"
ARCH="$(uname -m)"; OUT="SP-404-LEARN-${ARCH}.dmg"
rm -rf dmg-stage "$OUT" && mkdir dmg-stage
cp -R "macos/SP-404 LEARN.app" dmg-stage/
ln -s /Applications dmg-stage/Applications
hdiutil create -volname "SP-404 LEARN" -srcfolder dmg-stage -ov -format UDZO "$OUT"
rm -rf dmg-stage
echo "$(pwd)/$OUT"
