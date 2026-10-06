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
| 11 | Stem separation (drums / bass / lead / vocals, HT-Demucs, MPS/CUDA/CPU) | ✅ model downloaded on demand; verified on synthetic audio only |
| 12 | Better drum classifier | ⬜ swap behind `DrumClassifier` |
| 13 | Bass analysis (YIN pitch tracker, notes → steps → patterns/tutorial) | ✅ monophonic; verified on synthetic bass |
| 14 | Structure | 🟡 energy+pattern novelty; no vocal/sample detection |
| 15 | Packaging | 🟡 macOS arm64 `.app` with frozen sidecar (~1 GB with PyTorch); Windows, signing/notarisation, FFmpeg bundling decision pending |

## SP SYSTEM redesign (this branch)
✅ tokens + paper/ink UI · ✅ cow brand mark (® omitted) · ✅ genre SVG set · ✅ six-area IA · ✅ FX Lab / Tricks / Reference (verified-only) · ✅ device diagram + lesson view ·
✅ app icon · 🟡 more verified FX/Tricks content (Delay, MFX, chopping, swing… listed as `todo`) · ⬜ DROP ↔ LEARN interchange (spec only) · ⬜ UK Garage / Ambient courses (art exists).

## Known gaps
- Lead and vocal parts are separated and playable but not transcribed to notes.
- Vocal activity beyond a per-bar presence measure, swing/triplet substeps, ghost-note velocity analysis: not implemented.
- Intel Mac / Windows builds untested.
- FFmpeg must be installed for non-WAV input.
