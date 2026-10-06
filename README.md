# SP-404 LEARN

Drop a reference track; get a practical, step-by-step way to rebuild its rhythm on a Roland SP-404MKII.
Local-only: your audio never leaves the computer, no accounts, no telemetry.

**Audio → analysis → rhythmic transcription → SP-404MKII translation → interactive tutorial.**
It does not claim a perfect copy of the original — it gives a playable interpretation, with a confidence on every
detected hit and full manual correction.

## Six areas
**Home** (continue learning) · **Courses** (9 genre courses) · **FX Lab** (verified effect exercises) · **Tricks** (short verified procedures) ·
**Track Lab** (your track: tempo, stems, drums, bass, structure, SP recipe, chop/export) · **Reference** (searchable short answers).
FX Lab, Tricks and Reference only show content checked against Roland's SP-404MK2 documentation.

## What it does
- Tempo / beat grid / downbeat (with ÷2, ×2, edit), waveform from the real audio
- Stems: drums / bass / lead / vocals via HT-Demucs (one-time ~80 MB model download, then offline); audition with mute/solo
- Stem export & chopping for the SP-404MKII: whole stems or numbered chops (by bars, phrases or hits) as 16-bit/48 kHz mono WAV
- Bass notes (pitch, step, length) → piano roll, pattern and tutorial
- Drum events: kick, snare, clap, closed/open hat, perc — shown on a 16-step grid with confidence
- Manual correction: add, delete, move, retype, velocity; quantize 1/4–1/32 without losing original timing
- Rough structure → patterns A–D → SP-404 recipe (pad mapping, which steps on which pad)
- “LEARN THIS TRACK” walks through the recipe pad by pad; built-in genre courses need no track — Footwork, Jungle, Breakbeat, House, Hip-Hop, Techno, Trip-Hop, Lo-Fi House, Lo-Fi Hip-Hop (original educational patterns)
- Synth-based preview (no copyrighted audio is ever played back)

## Design
See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (SP SYSTEM tokens, components, logo/icon and genre-art rules) and [SP_SYSTEM_INTERCHANGE.md](SP_SYSTEM_INTERCHANGE.md) (future DROP ↔ LEARN exchange, design only).

## Screenshots
_(placeholder)_

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md).

## Installation (macOS, Apple Silicon)
1. Download `SP-404-LEARN-arm64.dmg` from the repository's **Releases** page, open it and drag the app to **Applications**.
2. The app is not notarized (no paid Apple Developer ID), so macOS will refuse the first launch. Either right-click the app →
   **Open** → **Open**, or run `xattr -cr "/Applications/SP-404 LEARN.app"` once.
3. MP3/FLAC/M4A/AIFF need FFmpeg: `brew install ffmpeg` (WAV works without it).
4. For stems, open **Settings → Model storage → Download** (~80 MB, one time).

Or build from source (below). Needs FFmpeg for MP3/FLAC/M4A/AIFF: `brew install ffmpeg` (WAV works without it).

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
scripts/make-dmg.sh     # drag-to-Applications DMG next to the .app
```
Output: `src-tauri/target/release/bundle/macos/SP-404 LEARN.app` (ad-hoc signed, not notarized). Releases are built by
`.github/workflows/release-macos.yml` on every `v*` tag (or run it manually from the Actions tab).

## Build Windows
Not yet tested. Same steps with `.venv\Scripts\python`; the Rust shell already looks for `sp404-sidecar.exe`.

## Models
None bundled. Stem separation uses HT-Demucs; download the weights from Settings → Model storage (the only network request the app makes, on your click). Dev setup: `.venv/bin/pip install torch torchaudio certifi einops julius pyyaml tqdm && .venv/bin/pip install --no-deps demucs`.

## Privacy
Everything runs locally; the only child process is the bundled analysis engine, talking over stdin/stdout.

## Limitations
- Stems/bass were verified on synthetic audio only — report how they behave on real tracks. Without stems, hats under snares/claps/kicks are often missed; low-confidence hits are marked `?`.
- Constant tempo only; no swing/triplet analysis; bass is monophonic, lead/vocals are not transcribed.
- Style labels are hints derived from measured characteristics, not a classification.
- SP-404MKII button names in the tutorial should be checked against your firmware manual.

MIT licensed. Unofficial; not affiliated with Roland.
