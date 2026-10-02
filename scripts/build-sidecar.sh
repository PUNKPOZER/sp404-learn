#!/usr/bin/env bash
# Freeze the Python engine into src-tauri/resources/sp404-sidecar (PyInstaller, one-dir).
set -euo pipefail
cd "$(dirname "$0")/../python"
PY="${PYTHON:-../.venv/bin/python}"
"$PY" -m pip install -q pyinstaller
"$PY" -m PyInstaller --noconfirm --onedir --name sp404-sidecar \
  --distpath ../src-tauri/resources --workpath ../build/pyi --specpath ../build/pyi \
  --paths . --collect-submodules demucs --collect-submodules numpy.core --hidden-import numpy.core.multiarray --collect-data demucs --collect-data certifi --exclude-module matplotlib --exclude-module torchvision --exclude-module tkinter --exclude-module pytest \
  sidecar/entry.py
