# Roadmap

Status key: ✅ done · 🟡 partial · ⬜ not started

| Phase | Item | Status |
|---|---|---|
| 0 | Research + architecture | ✅ |
| 1 | Tauri + React + TS shell (runs, builds `.app`) | ✅ |
| 2 | Drag & drop + waveform (real peaks from decoded audio) | ✅ |
| 3 | Python sidecar (stdio JSON, cancel, cache) | ✅ |
| 4 | BPM + beat grid + downbeat, ÷2/×2/edit | ✅ (constant tempo only) |
| 5 | Onset detection + drum classification | 🟡 heuristic; hats under snare/clap are weak without stems |
| 6 | 16-step sequencer (confidence, selection, 1/4–1/32 quantize) | ✅ |
| 7 | Manual correction (add/delete/move/retype/velocity) | ✅ |
| 8 | SP-404 translator (kit, patterns A–D, recipe) | ✅ |
| 9 | Tutorial mode | ✅ |
| 10 | Footwork course (18 lessons, original patterns) | ✅ text is first draft |
| 11 | Stem separation | ⬜ interface only — candidate: Demucs/HT-Demucs (MIT code; verify weights license) |
| 12 | Better drum classifier | ⬜ swap behind `DrumClassifier` |
| 13 | Bass analysis | ⬜ interface only (Basic Pitch is Apache-2.0; needs TF/ONNX runtime check on Py 3.14) |
| 14 | Structure | 🟡 energy+pattern novelty; no vocal/sample detection |
| 15 | Packaging | 🟡 macOS arm64 `.app` with frozen sidecar; Windows, signing/notarisation, FFmpeg bundling decision pending |

## Known gaps
- Vocal activity, swing/triplet substeps, ghost-note velocity analysis: not implemented.
- Intel Mac / Windows builds untested.
- FFmpeg must be installed for non-WAV input.
