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
| PyTorch | stem-separation runtime (CPU/MPS/CUDA) | BSD-3-Clause |
| Demucs (code) | HT-Demucs stem separation | MIT |
| einops, julius, PyYAML, tqdm, certifi | Demucs / TLS helpers | MIT, MIT, MIT, MPL-2.0/MIT, MPL-2.0 |
| CPython | runtime inside the frozen sidecar | PSF-2.0 |
| ONNX Runtime (`onnxruntime`) | runs the optional Genre Pack model (≈ 80 MB installed on macOS arm64, measured) | MIT |

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

- **HT-Demucs (`htdemucs`)** — Meta's published weights, released under the MIT license with the Demucs repo
  (verify on each update). **Not bundled**: downloaded once by the user (~80 MB, `dl.fbaipublicfiles.com`) from
  Settings → Model storage.

No other models. Before adding another, record its license and weights
license here — code and weights are often licensed differently.

## Optional downloads (never bundled in the app)

| Component | Use | Licence | Notes |
|---|---|---|---|
| HT-Demucs weights | stem separation | see Demucs repo (MIT code) | downloaded from Settings on the user's click |
| **Genre Pack — Discogs-EffNet** (`discogs-effnet-bsdynamic-1.onnx`, 18 MB) | genre detection + track embeddings | **CC BY-NC-SA 4.0 — non-commercial** (MTG-UPF, Essentia Models; a proprietary licence is available from MTG) | downloaded only on the user's click from essentia.upf.edu (fallback: the project owner's mirror), SHA-256 verified. If this project ever becomes commercial, obtain a licence from MTG-UPF first. The Essentia *library* (AGPL-3.0) is **not** used: the mel front-end is re-implemented in NumPy (`python/engine/genre/effnet_onnx.py`, ported from the owner's MIT-licensed `noesis`). |
