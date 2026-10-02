#!/usr/bin/env bash
# Plain (undecorated) DMG from the built .app — Tauri's styled DMG needs Finder scripting.
set -euo pipefail
cd "$(dirname "$0")/../src-tauri/target/release/bundle"
hdiutil create -volname "SP-404 LEARN" -srcfolder macos -ov -format UDZO "SP-404-LEARN-aarch64.dmg"
echo "$(pwd)/SP-404-LEARN-aarch64.dmg"
