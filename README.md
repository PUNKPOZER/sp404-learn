# SP-404 LEARN

Drop a reference track; get a practical, step-by-step way to rebuild its rhythm on a Roland SP-404MKII.
Local-only: your audio never leaves the computer, no accounts, no telemetry.

**Audio → analysis → rhythmic transcription → SP-404MKII translation → interactive tutorial.**
It does not claim a perfect copy of the original — it gives a playable interpretation, with a confidence on every
detected hit and full manual correction.

## What it does
- Tempo / beat grid / downbeat (with ÷2, ×2, edit), waveform from the real audio
- Drum events: kick, snare, clap, closed/open hat, perc — shown on a 16-step grid with confidence
- Manual correction: add, delete, move, retype, velocity; quantize 1/4–1/32 without losing original timing
- Rough structure → patterns A–D → SP-404 recipe (pad mapping, which steps on which pad)
- “LEARN THIS TRACK” walks through the recipe pad by pad; a built-in 18-lesson Footwork course needs no track
- Synth-based preview (no copyrighted audio is ever played back)

## Screenshots
_(placeholder)_

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md).

## Installation
Build from source (below). Needs FFmpeg for MP3/FLAC/M4A/AIFF: `brew install ffmpeg` (WAV works without it).

## Development
```bash
python3 -m venv .venv && .venv/bin/pip install numpy scipy pytest
npm install
npm run py:test && npm run typecheck && npm run lint && npm test
npm run tauri dev
```

## Build macOS
```bash
npm run dist            # freezes the Python engine (PyInstaller) and builds the .app
scripts/make-dmg.sh     # optional plain DMG
```
Output: `src-tauri/target/release/bundle/macos/SP-404 LEARN.app` (unsigned; right-click → Open the first time).

## Build Windows
Not yet tested. Same steps with `.venv\Scripts\python`; the Rust shell already looks for `sp404-sidecar.exe`.

## Models
None bundled. Stem separation / learned classifiers are optional future modules behind interfaces in `python/engine`.

## Privacy
Everything runs locally; the only child process is the bundled analysis engine, talking over stdin/stdout.

## Limitations
- Without stem separation, hats under snares/claps/kicks are often missed; low-confidence hits are marked `?`.
- Constant tempo only; no swing/triplet analysis; no bass or vocal analysis yet.
- Style labels are hints derived from measured characteristics, not a classification.
- SP-404MKII button names in the tutorial should be checked against your firmware manual.

MIT licensed. Unofficial; not affiliated with Roland.
