# Third-party licenses

Licenses were read from each project's published package metadata when the dependency was added
(2026-10). Re-check before each release. Nothing here is copyleft-linked into the app.

## Bundled in the app

| Component | Use | License |
|---|---|---|
| Tauri 2 (`tauri`, `tauri-build`, `tauri-plugin-dialog`) | desktop shell | Apache-2.0 OR MIT |
| React / React DOM 19 | UI | MIT |
| @tauri-apps/api, plugin-dialog (JS) | IPC / dialogs | Apache-2.0 OR MIT |
| NumPy | analysis engine | BSD-3-Clause |
| SciPy | analysis engine (STFT, filters, peak picking) | BSD-3-Clause |
| CPython | runtime inside the frozen sidecar | PSF-2.0 |

## Build/dev tooling (not shipped)

Vite (MIT), TypeScript (Apache-2.0), ESLint (MIT), Vitest (MIT), PyInstaller (GPL-2.0 with the
bootloader exception — frozen output may be distributed under any license), pytest (MIT).

## External programs (not bundled)

- **FFmpeg** — used for decoding MP3/FLAC/M4A/AIFF. Not distributed with this app: the user installs it
  (`brew install ffmpeg`). Builds are LGPL-2.1+ or GPL-2+ depending on configuration; bundling it is a
  separate licensing decision (see ROADMAP). Plain PCM WAV works without it.

## Audio

All preview sounds are synthesized in code (Web Audio and `engine/synth.py`). No samples or recordings are
included. Tests generate their own audio. Footwork course patterns are original educational patterns.

## ML models

None bundled. Before adding one (e.g. a stem separator or drum classifier) record its license and weights
license here — code and weights are often licensed differently.
