# PROJECT_AUDIT — SP-404 LEARN

Audit of the repository **as it exists at commit `dc7c464`** (`main`, tag `v0.2.0` released). Everything below was derived from the
source (TypeScript, Rust, Python, CI, configs), not from the README. Where the README/ROADMAP/ARCHITECTURE disagree with the code,
the code wins and the discrepancy is listed in §12.

Status vocabulary used throughout: **IMPLEMENTED** (works end to end and is exercised), **PARTIAL** (works with stated limits),
**MOCK** (stand-in data/behaviour), **NOT IMPLEMENTED**. "Verified" means covered by an automated test or exercised during
development; nothing in this repo has been validated on real commercial music (all analysis tests use synthetic audio).

Size of the code base: ≈ 5,600 lines of first-party code (TS/TSX 2,059, Python 2,919 incl. 313 test lines, Rust 131, CSS 261 dense lines,
CI/scripts ≈ 200). Lines are long and dense; treat line counts as a lower bound on complexity.

---

## 1. PRODUCT OVERVIEW

### Purpose
A **local-only desktop app (macOS Apple Silicon primary)** that takes a reference track, analyses it, and translates the result into
a practical, step-by-step recipe for rebuilding the groove on a Roland **SP-404MKII** (which sample on which pad, which TR-REC steps).
It also separates the track into stems, lets the user audition and chop them into SP-ready WAV files, and ships genre courses that
teach SP-404MKII beat building without needing a track.

### Current user workflow (actual)
1. Launch → Home. A spotlight tour (once) explains the interface.
2. Drop/open an audio file → real staged analysis (prepare → tempo → stems → drums → bass → structure → recipe).
3. **Track**: waveform, BPM (÷2/×2/edit, beat/step nudge, quantize 1/4–1/32), coloured structure strip, play the original.
4. **Stems**: drums/bass/lead/vocals lanes with mute/solo, **chop & export** panel (SP-ready 16-bit/48 kHz mono WAV).
5. **Drums / Bass**: edit/inspect detected events and notes, audition (synth or stem).
6. **Structure**: audition sections, jump into a section's first bar.
7. **SP Recipe**: patterns A–D, kit/pad mapping, "Learn this track" → step-by-step lesson.
8. Save/open `.sp404learn` project. Or skip all this and use **Learn** (9 genre courses).

### IMPLEMENTED
- Local analysis pipeline with real stage events, cancel, content-hash cache.
- Tempo/beat grid (constant tempo), half/double alternatives, downbeat guess, manual BPM/grid/quantize edits that preserve original timing.
- Drum event detection and classification (kick/snare/clap/closed hat/open hat/perc/unknown) with per-event confidence; manual add/delete/move/retype/velocity.
- Stem separation (HT-Demucs via PyTorch, MPS/CUDA/CPU) with on-demand weight download; stem playback with M/S.
- Monophonic bass note tracking (YIN) → piano roll, patterns, tutorial text; bass preview (synth) and bass-stem audition.
- Structure segmentation + section labels/colours; section/bar audition loops.
- Translator: `TrackAnalysis → SP404Recipe` (kit, patterns A–D, arrangement, tutorial steps).
- Tutorial renderer shared by track tutorials and 9 genre courses (original educational patterns).
- Synth preview (Web Audio) following the edited pattern live.
- Stem chop planning (whole / bars / phrases / hits) + export to WAV.
- Project save/load (JSON), settings page (model download, cache clear), spotlight onboarding tours, Russian UI.
- Packaging: frozen Python sidecar (PyInstaller) in a Tauri `.app`; GitHub Actions builds a DMG on `v*` tags.

### PARTIAL
- **Drum classification** — heuristic only (`heuristic-v1`); hats under snare/clap/kick are weak without stems; stem-based results are unverified on real music.
- **Stems on real music** — plumbing verified on synthetic audio only; stems are **mono** (downmixed in `demucs_sep.py`).
- **Bass** — monophonic YIN; no polyphony; timing relies on the (heuristic) grid.
- **Structure** — energy/density/step-occupancy novelty; labels INTRO/DROP/BREAK/OUTRO need >2–3 segments; no vocal/sample awareness.
- **Project reopen** — restores analysis, but stem/mix **playback and chop export depend on absolute cache paths** stored in the project (see §12).
- **Tutorials** — track tutorials only cover 6 drum voices + bass; lead/vocals/chops never appear in a track recipe; course musical accuracy is not validated on hardware.
- **Packaging** — macOS arm64 only; unsigned/not notarised (ad-hoc signature).
- **Settings** — model download and cache clear only (no cache size limit/eviction, no language, no persistent preferences).
- **SP-404MKII export compatibility** — correct audio format only (see §5).

### MOCK / placeholder
- None in the analysis path: no random or fake data feeds the UI.
- By design synthetic: Web Audio preview voices (`src/lib/audio/synth.ts`) and `python/engine/synth.py` (test/demo audio).
- Placeholder text: README "Screenshots (placeholder)".
- Unverified assumptions presented as fact in tutorial text: SP-404MKII button names (`PTN SEQ`, `TR-REC`, `BPM` in `python/translator/sp404/text.py`) and effect names in `courses.py` (`FX_NOTE` adds a disclaimer; step text for buttons has none).

### Abandoned / unfinished
- `python/engine/beats/` — empty package (`__init__.py` only); beat tracking lives in `engine/tempo/`.
- `python/engine/transcription/` — only `characteristics.py`; the name promises more.
- `previewSource` in `src/state/store.ts` — dead state field, never read/written by logic.
- "CACHE SIZE" setting from the original spec — not built (only "clear cache").
- Recent projects list, Windows/Intel builds, key detection, loop-point detection — not built.
- `ROADMAP.md`/`ARCHITECTURE.md` are partly stale (see §12).

---

## 2. TECHNOLOGY STACK

| Area | Choice (as built) |
|---|---|
| Languages | TypeScript (UI), Rust (Tauri shell, 131 lines), Python 3.13 in CI / 3.14 locally (engine), a little Bash |
| Desktop shell | **Tauri 2** (`tauri`, `tauri-plugin-dialog`; features: none extra) |
| UI framework | **React 19** + Vite 7, no router, no component library, no CSS framework |
| Audio (UI) | Web Audio API (`AudioContext`, buffer sources, oscillators/noise) — own synth voices + lookahead sequencer + stem player |
| DSP (engine) | **NumPy**, **SciPy** (`scipy.signal.stft`, filters, `find_peaks`, `resample_poly`, `ndimage`, `io.wavfile`) — no librosa/essentia |
| ML | **PyTorch** + **Demucs 4.1.0** (`htdemucs`), with `einops`, `julius`, `pyyaml`, `tqdm`, `certifi` |
| Decoding | **FFmpeg/ffprobe** (external, not bundled); PCM-WAV fallback via SciPy |
| External APIs | **None** at runtime. One user-triggered download of model weights from `dl.fbaipublicfiles.com` (Settings) |
| Databases | None. JSON files only |
| IPC | stdin/stdout JSON-lines between Rust and a Python child process (no ports); dev-only HTTP bridge `python/sidecar/dev_http.py` on `127.0.0.1:8404` |
| Build | Vite (`tsc -b && vite build`), Cargo/Tauri bundler, **PyInstaller** one-dir sidecar, `hdiutil` DMG script |
| Package managers | npm (`package-lock.json`), Cargo (`Cargo.lock`), pip (no `requirements.txt`/lockfile for Python) |
| Tests | pytest (22 tests), Vitest (2 tests) |
| CI | GitHub Actions `release-macos.yml` (macos-14, Python 3.13) |
| Platform-specific | macOS: MPS acceleration, `/opt/homebrew/bin` lookup for ffmpeg, ad-hoc signing (`signingIdentity: "-"`), `hdiutil`. Windows path handled in Rust (`sp404-sidecar.exe`, `.venv/Scripts`) but never built |

---

## 3. PROJECT ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│ UI  (React 19, src/)                                                       │
│  screens/ (11)  components/ (10)  styles.css (tokens + all CSS)            │
└───────────────▲──────────────────────────────────────┬───────────────────┘
                │ useSyncExternalStore                  │ imperative calls
┌───────────────┴──────────────────────────────────────▼───────────────────┐
│ Application logic (src/state/, src/lib/)                                   │
│  store.ts (single global state)  actions.ts (all side effects)             │
│  lib/sidecar.ts (RPC)  lib/audio/{synth,sequencer,preview,stemPlayer}.ts   │
│  lib/tours.ts  lib/sections.ts  lib/voices.ts  lib/types.ts                │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ Tauri invoke / events  (browser dev: fetch → dev_http.py)
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Rust shell (src-tauri/src/lib.rs, 131 lines)                               │
│  sidecar_start / sidecar_send, read/write_text_file, read_stem_file,       │
│  path_exists, autotest_path (debug only)                                    │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ stdin/stdout, one JSON object per line
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Audio / analysis services (python/)                                        │
│  sidecar/server.py (RPC, thread per request)                               │
│  engine/ pipeline → audio, tempo, stems, drums, bass, structure,           │
│          transcription(characteristics), cache, model                      │
│  translator/ quantizer, sp404/{pads,patterns,recipe,tutorial,learn,courses}│
└───────────────┬──────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Storage                                                                     │
│  cache dir (analysis JSON + stems/<hash>/*.wav), models dir, project JSON, │
│  user-chosen export folders, localStorage (tour flags)                      │
└───────────────┬──────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────────┐
│ External services: none at runtime. FFmpeg binary (user-installed);         │
│ one optional weights download (dl.fbaipublicfiles.com).                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### How data moves
1. **Open track** (`actions.openTrack`): UI calls `probe` (duration, SR, channels, 2,400-bucket waveform peaks) then `analyze`.
2. **`Analyzer.run`** (`pipeline.py`): probe → SHA-256 of file (first 32 hex chars) → cache lookup (`hash-v3-r16-{stems|mix}.json`) →
   decode mono 22.05 kHz → STFT (n_fft 1024, hop 128) → tempo/grid → write playback copy (stereo 44.1 kHz `mix.wav`) →
   stems (decode stereo 44.1 kHz, Demucs, resample to 22.05 kHz for analysis, save 44.1 kHz mono WAVs + peaks/activity) →
   drum transcription → bass → structure → characteristics/styles → cache write. Stage events stream back as `{event:"stage"}` lines.
3. The UI stores the returned `TrackAnalysis` JSON in the global store, then asks `recipe` (Python) to build the recipe/tutorial.
   Every manual edit mutates the analysis in the store (JS) and re-requests `recipe`; BPM/grid/quantize edits go through `regrid` (Python).
4. **Preview**: UI-only. `preview.ts` derives a `StepMap` from the current screen's data; `Sequencer` schedules Web Audio voices.
5. **Original/stem playback**: `stemPlayer.ts` asks Rust (`read_stem_file`, restricted to the cache dir) for WAV bytes → `decodeAudioData`.
6. **Chop/export**: UI → `chop_plan` (regions) → `export_chops` (writes WAV to a user-chosen folder).

---

## 4. FILE STRUCTURE (architecturally important only)

| Path | Responsibility |
|---|---|
| `src/App.tsx` | App shell (sidebar/topbar/content/transport/inspector grid), drag-drop wiring, first-visit tour trigger |
| `src/state/store.ts` | The single global state shape + `useStore` (external store) |
| `src/state/actions.ts` | **All side effects**: open track, analysis, edits, regrid, recipe refresh, project save/open, tutorials, courses |
| `src/lib/sidecar.ts` | RPC client; `isTauri` switch; `api.*` typed wrappers; `readStem` |
| `src/lib/audio/{synth,sequencer,preview,stemPlayer}.ts` | Web Audio voices, lookahead sequencer, screen→pattern mapping, original/stem playback with ranges |
| `src/lib/{types,voices,sections,tours,kit,sectionPlay}.ts` | TS data types, voice colours/labels/default kit, section colour language, tour scripts, helpers |
| `src/screens/*.tsx` | 11 screens (see §17) |
| `src/components/*.tsx` | `SP404PadGrid`, `StepSequencer`, `Waveform`, `ArrangementStrip` (exports `SectionStrip`), `ChopPanel`, `Transport`, `Sidebar`, `Inspector`, `Tour`, `Logo` |
| `src/styles.css` | Design tokens (`:root`) + every style in one file |
| `src-tauri/src/lib.rs` | Sidecar lifecycle + 7 registered commands (`sidecar_start`, `sidecar_send`, `read_text_file`, `write_text_file`, `path_exists`, `autotest_path`, `read_stem_file`); chooses bundled vs repo Python |
| `src-tauri/tauri.conf.json`, `capabilities/default.json` | Window, bundle (`targets: ["app"]`), ad-hoc signing, permissions (`core:default`, `dialog:default`), CSP **null** |
| `python/sidecar/server.py` | RPC dispatcher (`m_*` methods), one thread per request |
| `python/sidecar/dev_http.py` | Dev-only HTTP bridge (upload, `/rpc`, `/file`) for browser testing; not included in the frozen sidecar |
| `python/engine/pipeline.py` | Stage orchestration, cancellation, stage events, cache read/write |
| `python/engine/model.py` | Dataclasses: `DrumEvent`, `Grid`, `Section`, `BassNote`, `TrackAnalysis` (+ JSON (de)serialisation) |
| `python/engine/audio/{decode,spectro}.py` | FFmpeg decode/probe/peaks/hash, STFT helpers |
| `python/engine/tempo/tempo.py` | Tempo, grid refinement, downbeat |
| `python/engine/drums/{onsets,features,classifier,transcribe}.py` | Drum transcription chain; `DrumClassifier` protocol |
| `python/engine/stems/{base,demucs_sep,io,chop}.py` | Separator protocol/impl, stem persistence, chop planning/export |
| `python/engine/bass/{base,pitch}.py` | Bass analyzer protocol, YIN tracker |
| `python/engine/structure/segment.py` | Section detection and labelling |
| `python/engine/transcription/characteristics.py` | Density/syncopation measures + style hints |
| `python/engine/cache.py` | Hash-keyed JSON cache + stems dir + size/clear |
| `python/translator/quantizer.py` | Time → bar/step/offset (resolutions 4/8/16/32) |
| `python/translator/sp404/{pads,patterns,recipe,tutorial}.py` | Pad geometry/kit, consensus patterns, recipe, tutorial steps |
| `python/translator/sp404/{courses,learn}.py` | 9 data-driven genre course specs and the builder |
| `scripts/build-sidecar.sh`, `make-dmg.sh`, `make-icon.py` | Freeze sidecar, DMG, icon rasteriser |
| `.github/workflows/release-macos.yml` | Tag-triggered macOS build + GitHub Release |
| `ARCHITECTURE.md`, `ROADMAP.md`, `THIRD_PARTY_LICENSES.md`, `CONTRIBUTING.md` | Docs (partly stale, §12) |

---

## 5. AUDIO PIPELINE

| Capability | Status | Where / how | Limits |
|---|---|---|---|
| Audio import | **IMPLEMENTED** | Drag-drop (Tauri `onDragDropEvent`) and dialog; ext whitelist `wav aif aiff mp3 flac m4a` (`actions.ts`, `decode.SUPPORTED`) | Whitelist checked in UI only; engine accepts anything FFmpeg decodes |
| Decoding | **IMPLEMENTED** | `decode.decode` → `ffmpeg -f f32le` pipe; `probe` via ffprobe; PCM-WAV fallback via SciPy when FFmpeg is absent | FFmpeg not bundled; non-WAV fails without it. Whole file is held in RAM |
| WAV conversion (of the source) | **NOT IMPLEMENTED** | — | The original DROP-style "convert folder to 16/48" is not in this app |
| Sample-rate conversion | **IMPLEMENTED** | FFmpeg `-ar` (22,050 analysis / 44,100 stems+playback); `resample_poly` 44.1→22.05 kHz (stems) and →48 kHz (export) | Mono 22.05 kHz analysis caps band energy at 11 kHz |
| BPM detection | **IMPLEMENTED** (constant tempo) | Onset-flux autocorrelation with beat/bar harmonics → fold-phase refinement → regression on full-mix hits → downbeat by low-band attack. `Grid.candidates` offers ½/2× | Phase *within* a beat can be off by whole 16ths (UI has ◀/▶ Step nudge); no tempo changes, no time-signature detection (fixed 4/4) |
| Key detection | **NOT IMPLEMENTED** | — | No chroma/key code anywhere |
| Waveform generation | **IMPLEMENTED** | `decode.peaks` (min/max buckets); `probe` decodes at 11,025 Hz → 2,400 buckets; stems 1,600 buckets (`stems/io.py`); drawn on `<canvas>` | Fixed resolution, no zoom/scroll; `probe` costs an extra full decode |
| Transient detection | **IMPLEMENTED** (drums) | `drums/onsets.py`: log-spectral flux per band (low/mid/upper/high), adaptive threshold, clustering; `chop.plan_hits` (energy-derivative) for stems | Transients are not exposed as generic slice markers on the full mix |
| Slicing / chopping | **IMPLEMENTED** (stems) | `chop.py`: `whole`, `bars` (1/2/4/8), `phrases` (silence gaps), `hits`; fades 3 ms/10 ms; regions selectable/auditionable in `ChopPanel` | No manual region editing/dragging, no chopping of the full mix, no slice-boundary refinement |
| Stems | **IMPLEMENTED / quality PARTIAL** | `stems/demucs_sep.py` HT-Demucs `htdemucs`, device `mps`→`cuda`→`cpu`, CPU fallback on failure; parts: drums/bass/lead(=other)/vocals; saved as 16-bit 44.1 kHz **mono** WAV | Verified on synthetic audio only; not stereo; ≈ 125 MB cache per 4 min track (mix + 4 stems) |
| Looping | **PARTIAL** | Playback loops for sections/bars/patterns (`stemPlayer.range`, `Sequencer.loop`) | No loop-point *detection*, no seamless loop export |
| Normalization | **PARTIAL** | Optional peak −1 dBFS at export (`export_regions(normalize=…)`, default off). Demucs input is internally normalised/denormalised | No loudness (LUFS) handling |
| Export | **IMPLEMENTED** | `export_chops` → `<folder>/<track>_stems/<track>_<part>[_NN].wav`; "all parts whole" button | Stem export only. No export of recipes/patterns (no MIDI, no SP pattern/pad-bank files, no PDF) |
| SP-404MKII compatibility | **PARTIAL** | Output is 16-bit / 48 kHz PCM **mono** WAV (a format the SP loads without conversion) | No stereo, no embedded metadata/BPM tags, no pad-bank/project (`.zip`/`.sp4`-like) structure, no sample-length/size checks, no file-name length rules. Compatibility with the device was never tested on hardware |
| Drum transcription | **IMPLEMENTED / PARTIAL accuracy** | §1; `DrumClassifier` protocol allows swapping | Heuristic thresholds tuned on synthetic drums |
| Bass transcription | **IMPLEMENTED** (mono) | `bass/pitch.py`: YIN (28–330 Hz), median smoothing, segmentation, amplitude-onset timing, grid step | One voice only; notes before bar 1 are dropped |
| Structure | **PARTIAL** | `structure/segment.py` | See §1 |

---

## 6. USER INTERFACE

- **Shell** (`App.tsx` + `styles.css`): CSS grid `196px | 1fr | 280px` (inspector only on Drums); rows `auto | 1fr | auto` = top bar, scrolling content, transport.
- **Navigation**: `Sidebar` buttons set `state.screen`; no router/URLs/history. Screens needing a track are disabled until `analysis` exists. First-visit **spotlight tours** (`Tour.tsx`, scripts in `lib/tours.ts`, completion flags in `localStorage` key `sp404learn.tours`); "? Подсказки" replays.
- **Screens**: 11 (§17).
- **Reusable components**: `SP404PadGrid` (strict 4×4 CSS grid, pads 13–16 on top), `StepSequencer` (16 steps in 4 beat groups; wraps for 1/32), `Waveform` (canvas; section tints, bar grid, current-bar box, optional markers/playhead), `SectionStrip`, `ChopPanel`, `Transport`, `Sidebar`, `Inspector`, `Tour`, `Logo`/`LogoMark`.
- **Buttons**: one `.btn` family (pill, `.sm/.xs/.big/.primary/.on/.danger/.tab`), no shared React `Button` component — class strings only.
- **Cards/panels**: `.panel`, `.card`, `.course`, `.arr-seg`; **Modals**: none (one custom context menu on Drums; native `window.prompt` for BPM edit in `Track.tsx` — a UI wart).
- **Typography**: system fonts only (`-apple-system`/`SF Pro`, `ui-monospace`) — no webfonts (offline-safe).
- **Colours**: tokens in `:root` (dark surfaces `--bg/--surface*/--line*`, accents `--mint --violet --coral --amber --sky --pink`). Voice colours are duplicated in `lib/voices.ts` (`VOICE_COLORS`) and as `--v-*` CSS variables for 7 voices; section colours in `lib/sections.ts`.
- **Spacing/radius**: ad hoc pixel values; two radius tokens (`--r`, `--r-sm`), most radii hard-coded (999px pills, 9–18px).
- **Animations**: 9 CSS `transition` rules (button press, pad press, cell press, tour spotlight move, progress bar); no keyframe animations; playheads are `requestAnimationFrame`-driven.
- **Icons**: none (text glyphs ▶ ■ ◀ ✎ ↓); logo is inline SVG (`Logo.tsx`) + `src/assets/logo.svg`/`docs/logo.svg`; app icon generated by `scripts/make-icon.py`.
- **Design system?** An **informal** one: CSS tokens + naming conventions in a single 261-line stylesheet. No documented system, no component primitives, no token export (JSON/Style Dictionary), no light theme, no responsive breakpoints beyond one `@media (max-width: 1180px)`.
- **Language**: Russian strings are hard-coded in TSX and also **in Python** (stage labels, warnings, tutorial text, course text, section labels). No i18n layer.

---

## 7. DATA MODEL

Python dataclasses (`python/engine/model.py`) are mirrored by hand in `src/lib/types.ts`; JSON is the contract.

```jsonc
// DrumEvent  (steps are 0-based in the engine; the UI shows step+1)
{ "id":"e12", "time":1.438, "type":"KICK", "confidence":0.94, "velocity":0.8,
  "bar":2, "step":6, "quantized_time":1.4375, "timing_offset":0.0005, "manual":false }

// Grid
{ "bpm":160.0, "origin":0.953, "beats_per_bar":4, "candidates":[80,160.25], "confidence":1.0 }

// TrackAnalysis (abridged)
{ "schema":1, "path":"/Users/.../track.wav", "filename":"track.wav", "duration":30.4, "sample_rate":44100, "channels":2,
  "audio_hash":"12e3…", "grid":{…}, "events":[…], "sections":[{"label":"БРЕЙК","start":12.0,"end":18.0,"start_bar":8,"end_bar":12,"cluster":"B","energy":3.1}],
  "bass":[{"time":3.96,"duration":0.23,"midi":29,"confidence":0.99,"bar":2,"step":0}],
  "characteristics":{…}, "likely_styles":[…], "warnings":[…], "stages":[…], "resolution":16,
  "stems":{"drums":{"path":"<cache>/stems/<hash>/drums.wav","peaks":[[min,max]…],"activity":[…],"duration":…,"rms":…},
           "bass":{…},"lead":{…},"vocals":{…},"mix":{"path":"…/mix.wav","peaks":[],"activity":[]}},
  "stems_model":"htdemucs" }

// Recipe (SP404Recipe.to_dict)
{ "bpm":160, "title":"track.wav", "kit":{"1":{"voice":"KICK","label":"БОЧКА"},…},
  "patterns":[{"name":"A","bars":1,"label":"СЕКЦИЯ A","steps":{"KICK":[1,4,7,11,16],…,"BASS":[1,7,12]},
               "notes":{"BASS":{"1":29,"7":29,"12":27}},"source_bars":8}],
  "arrangement":[{"label":"…","start":0,"end":12,"start_bar":0,"end_bar":8,"pattern":"A"}],
  "tutorialSteps":[{"id":0,"total":44,"section":"КИТ","title":"…","text":"…","voice":"KICK","pad":1,"highlight":[],"grid":{}}], "notes":[…] }

// Project file (*.sp404learn, JSON)
{ "format":"sp404learn","version":1,"trackPath":"…","peaks":[…],"analysis":{…},"kit":{"1":"KICK",…},
  "patternEdits":{"A":{…}},"minConfidence":0.3,"tutorialIndex":0,"settings":{"currentBar":0,"activePattern":"A"} }
```

Other models: `Course`/`CourseMeta` (course specs in `courses.py`), `TutorialStep` (shared by tracks and courses), `Section` colours derived from label/cluster, `ModelStatus`. There is **no sample-library model**, no pad-bank model, and no device-definition model (pad layout and default kit exist twice: `translator/sp404/pads.py` and `src/lib/voices.ts`).

---

## 8. STATE MANAGEMENT

- One **global mutable store** (`src/state/store.ts`): a module-level `state` object, `setState(patch|fn)`, listeners, `useStore(selector)` implemented with `useSyncExternalStore`. No library.
- **All side effects** live in `actions.ts` (async functions that call the sidecar and `setState`). Components call actions directly; no reducers/events.
- Audio runtime state lives **outside** the store in module singletons: `sequencer` (`preview.ts`), `stemPlayer.ts` (buffers, sources, range), `synth.ts` (AudioContext). The store holds only mirrors (`playing`, `playStep`, `stemTime`, `audioTag`, …).
- Persistent state: only project files and `localStorage` tour flags. `kit`, `patternEdits`, `minConfidence` are session state saved into projects.
- Many components subscribe to the **whole state** (`useStore((s) => s)` in 12 places) and `stemTime` is written on every animation frame while stems play → broad re-renders (§11).
- Race handling: `recipeSeq` guard in `refreshRecipe`; no request cancellation on the UI side besides analysis `cancel`.

---

## 9. FILE STORAGE

| Data | Location |
|---|---|
| Analysis cache | `SP404LEARN_CACHE` env, set by Rust to Tauri `app_cache_dir()/analysis` (macOS: `~/Library/Caches/app.sp404learn.desktop/analysis`); falls back to `~/.sp404learn/cache` if the sidecar is started without the env; dev bridge uses the OS temp dir. Files: `<hash>-v3-r<res>-{stems|mix}.json` |
| Stems / playback copy | `<cache>/stems/<hash>/{drums,bass,lead,vocals,mix}.wav` (16-bit; 44.1 kHz mono stems, 44.1 kHz stereo mix) |
| Model weights | `~/.sp404learn/models` (`SP404LEARN_MODELS`; `TORCH_HOME` set to it). `hub/checkpoints/955717e8-*.th` ≈ 80 MB. **Not** under the app's data directory |
| Projects | User-chosen path, `*.sp404learn` JSON; audio is **not** copied; stems/mix are referenced by absolute cache path |
| Settings | None persisted (no settings file). Tour-seen flags in WebView `localStorage` |
| Exports | User-chosen folder → `<track>_stems/` |
| Temp files | Dev bridge uploads (`tempfile.mkdtemp`), PyInstaller work dir `build/`, Tauri `target/` |
| Cache hygiene | No eviction/size cap; only "Clear cache" (`Cache.clear` removes the whole directory, including stems) |

---

## 10. EXTERNAL DEPENDENCIES

| Dependency | Purpose | Actively used | Replaceable | Licence / platform notes |
|---|---|---|---|---|
| Tauri 2 + `tauri-plugin-dialog` | Desktop shell, file dialogs | Yes | Electron possible; Rust shell is tiny | Apache-2.0/MIT. WebView differs per OS (WKWebView/WebView2) |
| React 19, Vite 7, TypeScript | UI/build | Yes | Yes | MIT/Apache-2.0 |
| `@tauri-apps/api`, `plugin-dialog` (JS) | IPC, dialogs | Yes | With Tauri | Apache-2.0/MIT |
| NumPy, SciPy | All DSP | Yes | Replaceable by librosa/essentia but not needed | BSD-3 |
| PyTorch | Demucs runtime | Yes (stems only) | ONNX/CoreML runtimes possible | BSD-3; **drives the ≈ 1 GB app size**; MPS/CUDA/CPU |
| Demucs 4.1.0 (+ einops, julius, pyyaml, tqdm) | Stem separation | Yes | Other separators behind `StemSeparator` | Code MIT; upstream repo is archived (no updates); weights from Meta, stated MIT — re-verify per release |
| certifi | TLS CA bundle for the weight download (python.org builds lack CAs) | Yes | — | MPL-2.0 |
| FFmpeg / ffprobe | Decoding non-WAV, probing | Yes (external) | Python decoders could replace it | LGPL/GPL depending on build; **not bundled** (user installs); WAV-only fallback exists |
| PyInstaller | Freeze sidecar | Build only | Nuitka/PyOxidizer | GPL-2 + bootloader exception (output unrestricted). Needs hidden-import workarounds (`numpy.core`, demucs submodules) |
| pytest, Vitest, ESLint, typescript-eslint | Tests/lint | Dev only | — | MIT |
| GitHub Actions / `gh` | CI/release | CI only | — | macOS runners bill at a multiplier on private repos |

Licensing watch-points: `THIRD_PARTY_LICENSES.md` exists but is a manual list (no automated licence scan); Demucs weights licence should be re-checked at each release; the repo's own licence (MIT, "SP-404 LEARN contributors") has not been confirmed by the owner.

---

## 11. PERFORMANCE

- **Large files**: the whole file is decoded into memory several times: `probe` (11 kHz mono for peaks) + analysis decode (22.05 kHz mono) + `mix.wav` (44.1 kHz stereo) + stems decode (44.1 kHz stereo again). A 5-minute track ≈ 106 MB float32 per stereo decode; STFT magnitude (hop 128, 513 bins) ≈ 100 MB; Demucs adds model + chunk tensors. Expect high peak RAM (several GB) for long tracks; no streaming/chunking outside Demucs' own segmenting.
- **Waveform rendering**: fixed 2,400/1,600 buckets on a canvas → cheap; but there is **no zoom**, so detail on long tracks is poor. Canvas redraws on resize/state changes (not per frame).
- **Stems**: dominant cost (≈ 8 s for 25 s of audio on an M3 GPU in a synthetic test; scales roughly linearly). First launch of the frozen sidecar on macOS is very slow (OS scanning of a ≈ 580 MB bundle). Progress is reported per Demucs segment.
- **Analysis**: NumPy/SciPy, sub-second for 30 s synthetic audio; YIN is a Python-level loop per frame (chunked FFTs) — likely seconds for long tracks.
- **Memory**: no cache eviction, no stem unloading in the UI (decoded `AudioBuffer`s stay for the session, ≈ 4 × decoded stems + mix).
- **Background processing**: each RPC runs in its own thread; analysis checks the cancel flag only **between stages** (a long stem pass cannot be interrupted mid-stage).
- **UI blocking**: analysis is off the UI thread (child process). Risk areas: `stemTime` updated each frame re-renders every whole-state subscriber (`Track`, `Bass`, `Transport`, `Inspector`, … and `SectionStrip`); `JSON.stringify` of large analyses (events + stems peaks) on every project save and every `recipe`/`regrid` RPC (the full analysis is re-sent each time).
- **IPC volume**: `recipe` re-sends the whole `TrackAnalysis` on every edit; `read_stem_file` returns whole WAVs (≈ 20–40 MB) through Tauri IPC.

---

## 12. CURRENT PROBLEMS

Searched for `TODO|FIXME|HACK|XXX|temporary|mock|placeholder`: **no markers in first-party code** (the only "placeholder" is the README screenshots line). Real issues found by reading the code:

1. **Project reopen vs. cache paths** — `.sp404learn` embeds absolute cache paths for stems/mix. After "Clear cache", moving the project, or opening it on another machine, Track/Stems playback and chop export fail (`read_stem_file` rejects/lacks files) while the analysis still loads. There is no "re-materialise stems" path.
2. **Unscoped file commands** — Rust `read_text_file`/`write_text_file` accept any path from the WebView; CSP is `null`. `read_stem_file` is correctly restricted to the cache dir. Low risk today (no remote content) but not least-privilege.
3. **CI does not run the sidecar tests** — workflow uses `-k "not sidecar"`, which also skips `test_chop_plan_and_export_through_sidecar`. Only 2 TS tests exist; no UI/E2E tests; no CI step builds/launches the packaged app.
4. **Version drift** — `package.json` and `tauri.conf.json` say `0.1.0`; releases are tagged up to `v0.2.0`. The in-app version string in `ping` is `0.1.0`.
5. **Dead/vestigial code** — `previewSource` state; empty `engine/beats`; `autotest_path` command + DEV-only hook in `main.tsx` (kept in the repo, debug-only); `dev_http.py` (dev tool in the production tree); `ArrangementStrip.tsx` exports `SectionStrip`.
6. **Duplicated logic across the TS/Python boundary** — default kit and pad rows (`voices.ts` ↔ `pads.py`), note-name helper (`voices.ts` ↔ `tutorial.py`), slot/time quantisation (`actions.ts` `slotTime` ↔ `quantizer.py`), 16-step folding `floor(step*16/res)+1` repeated in `Drums.tsx`, `Bass.tsx`, `preview.ts`, voice colours/labels in four places (TS map, CSS vars, Python labels, tour copy).
7. **Language coupling** — Russian UI text is embedded in the engine/translator output (stage names, warnings, section labels, tutorial/course text). Section label strings (`ИНТРО`, `ДРОП`, `БРЕЙК`, `АУТРО`) are used as **identifiers** in `lib/sections.ts` colour lookup → fragile.
8. **Docs drift** — `ROADMAP.md` still lists "Footwork course (18 lessons)" as Phase 10 and has no entry for chop/export, the nine genre courses, onboarding tours or the Stems/Bass screens; `ARCHITECTURE.md` still says `learn.py` builds *the Footwork course* (it now builds any of nine specs from `courses.py`) and does not mention chop/export or tours. (Its stems/bass paragraphs were updated and are accurate.)
9. **Unverified domain claims** — SP-404MKII button names and effect names in tutorial text; genre pattern musicality; all analysis accuracy on real music; HT-Demucs weights licence statement.
10. **UX warts** — BPM edit uses `window.prompt`; tour step positions rely on selector lookups (`data-tour` attributes) and silently fall back to a centred card if an element is missing; no undo/redo for edits; no confirmation before discarding an unsaved project.
11. **Stems mono downmix** — documented limitation, but it is a lossy choice baked into the persisted cache format.
12. **Cache growth** — unbounded; `Cache.clear` is all-or-nothing.
13. **Tempo model** — constant tempo, 4/4 only; grid phase ambiguity inside a beat is only fixable by manual nudging.

---

## 13. TECHNICAL DEBT (ranked)

**CRITICAL**
- None that corrupt user data or block current use. (Closest: #1 project/cache coupling — silent loss of playback after cache clear.)

**HIGH**
- Project format depends on cache-internal absolute paths (§12.1).
- No automated verification of analysis accuracy on real audio (only synthetic fixtures) — every "works" claim about stems/drums/bass on music is unproven.
- CI excludes sidecar tests and never smoke-tests the frozen app.
- Hand-maintained TS↔Python schema/constants duplication (no shared schema or generated types).
- Whole-state subscriptions + per-frame `stemTime` writes (scales poorly as screens grow).

**MEDIUM**
- UI language baked into engine output; no i18n layer.
- `actions.ts` is a single 194-line grab-bag (analysis, edits, projects, tutorials, courses).
- Unscoped `read_text_file`/`write_text_file`; `csp: null`.
- No cache eviction/size UI; repeated full decodes in the pipeline.
- Version numbers not single-sourced; docs drift.
- Classifier thresholds are hard-coded in `classifier.py`/`onsets.py` with no calibration set.
- Python dependencies are not pinned (no requirements/lock); CI installs latest `torch`/`demucs`.

**LOW**
- Dead state field, empty packages, stray dev hooks in the production tree.
- `window.prompt` BPM dialog; ad hoc spacing/radius values; single large CSS file.
- Button/card styles are class conventions rather than components.

---

## 14. WHAT SHOULD NOT BE REWRITTEN

- **Sidecar protocol** (`sidecar/server.py` ⇄ `lib/sidecar.ts` ⇄ `lib.rs`): small, local, testable, cancel-aware; also works in a browser via the dev bridge. Keep.
- **`TrackAnalysis`/`Recipe`/`TutorialStep` data model** and the "tutorial steps carry full visible state" idea — it lets one renderer serve track tutorials and all courses.
- **Quantizer** (`translator/quantizer.py`): preserves original time, bar, step and offset; unit-tested.
- **Pipeline orchestration** (`pipeline.py`): real stage events, degrade-to-warning for optional stages, cache keyed by content hash.
- **Protocol seams**: `DrumClassifier`, `StemSeparator`, `BassAnalyzer` — they make the ML upgrades evolutionary.
- **Translator** (`pads`, `patterns`, `recipe`, `tutorial`, data-driven `courses`/`learn`): adding a genre is a data edit; covered by consistency tests.
- **Chop planning/export** (`engine/stems/chop.py`): small, pure, tested; matches the SP-404 file format.
- **Web Audio engine** (`synth`, `sequencer`, `preview`, `stemPlayer`): works, avoids copyrighted playback in tutorials, lookahead scheduling is sound.
- **Components `SP404PadGrid`, `StepSequencer`, `SectionStrip`, `Waveform`**: generic enough, visually settled.
- **Packaging path** (PyInstaller sidecar + Tauri bundle + tag-driven CI): proven to produce a working DMG.
- **Offline-first / local-only posture** and the explicit, user-triggered model download.

---

## 15. WHAT SHOULD BE REFACTORED (eventually; not now)

- Split `actions.ts` by domain (analysis, editing, project IO, learning); introduce selector-based subscriptions and move `stemTime` to a dedicated mini-store/refs.
- Introduce a **shared schema** for TS ↔ Python (JSON Schema/TypeBox/Pydantic-generated types) and a single source for kit/pad/voice constants.
- Separate user-facing strings from engine output (message keys + a UI i18n layer); replace label-string identifiers with enums.
- Make the **project format self-contained or re-materialisable** (store stem hashes/recipes, regenerate or re-link stems; relative paths).
- Replace `window.prompt` with an in-app input; extract `Button`/`Panel`/`Card` primitives and a token file.
- Pipeline: decode once and share buffers; avoid re-sending the whole analysis per edit (send deltas or reference by hash).
- Scope Rust file commands (dialog-granted paths only); tighten CSP.
- Move `dev_http.py` and the autotest hook behind a `dev/` boundary or feature flag.
- Pin Python dependencies; add a lockfile and a licence scan to CI.
- Classifier calibration harness (labelled real-world fixtures) before any rewrite of `classifier.py`.

---

## 16. REUSABLE COMPONENTS (candidates for sharing across an SP-404 ecosystem)

| Candidate | Where | Readiness |
|---|---|---|
| **Design tokens** (colours, radii, typography) | `:root` in `styles.css`, `lib/voices.ts`, `lib/sections.ts` | Needs extraction into a token file; currently entangled with component CSS |
| **SP404PadGrid** | `components/SP404PadGrid.tsx` + `.pad*` CSS | High: props-only (`kit`, `highlighted`, `selected`, `active`, `onPad`) |
| **StepSequencer** | `components/StepSequencer.tsx` | High: generic over voices/cells |
| **Waveform / SectionStrip / ChopPanel** | `components/` | Medium: Waveform and strip are generic; ChopPanel is bound to this app's `api` and store |
| **Audio engine** (synth, sequencer, stem player) | `lib/audio/*` | Medium: depends on the global store for patterns/state; needs injection |
| **SP-404 device definitions** | `pads.py` (pad geometry, default kit), `voices.ts` | Low-medium: duplicated and tiny; should become one data file |
| **Sample metadata** | — | Not present (no sample/library model) |
| **BPM/grid analysis** | `engine/tempo`, `translator/quantizer.py` | High as a Python library (numpy/scipy only) |
| **Drum/bass/structure analysis** | `engine/drums`, `engine/bass`, `engine/structure` | Medium: protocols are clean; accuracy unproven |
| **Chop planning + SP export** | `engine/stems/chop.py` | High: pure functions, tested, no framework dependency |
| **Project format** | `*.sp404learn` JSON (`actions.ts`) | Low: path-coupled, no schema/version migration beyond `version: 1` |
| **Sidecar RPC pattern** | `sidecar/server.py`, `lib/sidecar.ts`, `lib.rs` | High |
| **Tutorial/course engine** | `translator/sp404/{tutorial,learn,courses}.py`, `screens/Tutorial.tsx` | High: data-driven |

---

## 17. SCREEN INVENTORY

| Screen (`state.screen`) | File | Purpose |
|---|---|---|
| Home (`home`) | `screens/Home.tsx` | Drop/open a track; start any genre course; open project; privacy note |
| Analyzing (`analyzing`) | `screens/Analyzing.tsx` | Real stage list with live detail, cancel/retry |
| Track (`track`) | `screens/Track.tsx` | Waveform + playback, section strip, BPM/grid/quantize controls, characteristics, style hints, notes |
| Stems (`stems`) | `screens/Stems.tsx` + `ChopPanel` | Four stem lanes, mute/solo, playback, chop planning and export |
| Drums (`drums`) | `screens/Drums.tsx` + `Inspector` | Per-bar 16-step grid of detected hits, confidence threshold, edit/inspect, synth/stem audition, where-in-track panel |
| Bass (`bass`) | `screens/Bass.tsx` | Note-start markers on a waveform, piano roll for the bar, note table, synth/stem audition |
| Structure (`structure`) | `screens/Structure.tsx` | Coloured section strip + cards; play a section, jump to Drums/pattern |
| SP Recipe (`recipe`) | `screens/Recipe.tsx` | Patterns A–D editor, sections using the pattern, kit/pad mapping, "what goes where", Learn button |
| Learn (`learn`) | `screens/Learn.tsx` | Catalogue of 9 genre courses |
| Tutorial (`tutorial`) | `screens/Tutorial.tsx` | Step renderer (pad grid + step grid + text + progress) for track tutorials and courses |
| Settings (`settings`) | `screens/Settings.tsx` | Local-processing statement, model download/status, cache size/clear |
| (overlay) Tour | `components/Tour.tsx` | Spotlight onboarding per screen |

Note: the Transport is hidden on Home, Analyzing, Learn, Settings and Structure; the Inspector is shown on Drums only.

---

## 18. USER FLOW (actual, current)

1. Launch the app → Home; first run shows the welcome tour (6 steps; "Skip" or Esc closes; completion stored in `localStorage`).
2. Drop a WAV/MP3/FLAC/M4A/AIFF (or click the drop zone). Non-WAV needs FFmpeg installed.
3. Analyzing screen shows each stage live. If the stem model is not downloaded, the stems stage is *skipped* with a warning and analysis continues on the full mix.
4. Track screen opens (second tour, once). The user checks BPM (÷2/×2/edit), nudges the downbeat/step, plays the track, clicks sections.
5. Optional: Settings → download the ~80 MB model, then re-open the track (cached mix-only analyses are re-run because the cache key includes `stems`/`mix`).
6. Stems: audition parts, choose a part and chop mode, pick a folder, export WAVs.
7. Drums/Bass: inspect/correct hits and notes, audition.
8. SP Recipe: choose pattern A–D, toggle steps, remap pads, press **Learn this track**.
9. Tutorial: Next/Back through pad-selection and step-placement steps; Done returns to Recipe.
10. Save (`.sp404learn`), later Open project (analysis restored without recomputation; see the cache-path caveat, §12.1).
Without a track: Home/Learn → pick a genre → Tutorial.

---

## 19. BUILD & RUN

**Requirements** — macOS (Apple Silicon is the only validated target); Node ≥ 22 + npm; Rust stable (`rustup`); Python 3.13/3.14 with a venv; FFmpeg on PATH or in `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` (non-WAV input); ≈ 3 GB for the PyTorch environment; internet **once** for the model download.

**Dev** (from the repo root):
```bash
python3 -m venv .venv
.venv/bin/pip install numpy scipy pytest certifi einops julius pyyaml tqdm torch torchaudio
.venv/bin/pip install --no-deps demucs
npm install
source ~/.cargo/env && npm run tauri dev      # debug builds always run the repo Python (.venv), not the frozen sidecar
```
Browser-only UI work: `cd python && ../.venv/bin/python -m sidecar.dev_http` + `npm run dev` (UI shows "режим разработки в браузере"; file dialogs/projects unavailable).

**Checks**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run py:test` (22 + 2 tests; no UI tests).

**Release build**: `npm run dist` (= `scripts/build-sidecar.sh` → PyInstaller one-dir into `src-tauri/resources/sp404-sidecar` (≈ 580 MB) → `tauri build --config '{"bundle":{"resources":[…]}}'`), then `scripts/make-dmg.sh` (hdiutil, drag-to-Applications). Result: `.app` ≈ 1 GB, DMG ≈ 343 MB. Tauri's own DMG target is disabled (needs Finder scripting). `.app` is ad-hoc signed, **not notarised** (users run `xattr -cr` or right-click → Open).

**CI**: `.github/workflows/release-macos.yml` — on `v*` tags or manual dispatch: macos-14, Python 3.13, install deps, typecheck/lint/Vitest/pytest (`-k "not sidecar"`), freeze sidecar, `tauri build`, `make-dmg.sh`, upload artifact, `gh release create` with the DMG.

**Not built/validated**: Windows, Intel macOS, iOS (the Python/PyTorch engine cannot run on iOS).

---

## 20. REPOSITORY HEALTH

| Dimension | Score | Rationale |
|---|---|---|
| Architecture | **7 / 10** | Clear layers (UI → store/actions → Rust shell → Python sidecar), protocol seams for ML, data-driven tutorials. Held back by TS↔Python duplication, path-coupled project format, whole-state subscriptions, language mixed into the engine. |
| Code quality | **6.5 / 10** | Small modules, typed, linted, no TODO debris, meaningful tests on core maths. Dense one-line style, a few oversized files (`actions.ts`, `styles.css`), unpinned Python deps, dead fields. |
| UI consistency | **7.5 / 10** | One coherent dark/rounded look, consistent controls and colour language across screens; but no component primitives or documented system, hard-coded values, `window.prompt`. |
| Performance | **5.5 / 10** | Adequate on short audio; repeated full decodes, high peak RAM, no zoomable waveform, per-frame global re-renders, whole-analysis IPC, 1 GB app. Stems are GPU-accelerated on Apple Silicon. |
| Maintainability | **6 / 10** | Readable and modular, docs exist but drift; thin test net (2 UI tests, CI skips sidecar tests, no real-audio fixtures); manual release steps are well scripted. |
| Feature completeness | **6.5 / 10** | The full "track → recipe → lesson" loop plus stems, bass, chop/export and 9 courses work; missing key detection, loop detection, pattern/MIDI export, polyphonic/lead/vocal transcription, Windows/Intel, device-validated export, any real-music accuracy validation. |

---

## 21. RECOMMENDED NEXT STEPS (not to be implemented here)

1. **Build a small real-audio evaluation harness** (licensed or self-made loops with labelled hits/notes/BPM) and record baseline accuracy for tempo, drum classes, bass notes and chop quality — it protects everything below.
2. **Fix the project/cache coupling**: store stem identities (hash + part) instead of absolute paths and re-link/regenerate on open; show a clear "stems missing" state.
3. **Extend CI to run all Python tests and a smoke test of the frozen sidecar** (ping + analyze a synthetic file), and pin Python dependencies with a lockfile.
4. **Single-source shared constants/schemas** (kit, pad layout, voices, note names, TS types generated from Python models) — this is the prerequisite for sharing code with another SP-404 app.
5. **Extract design tokens and a few primitives** (`Button`, `Panel`, `Chip`) from `styles.css` without changing the look; document them.
6. **Separate user-facing strings from engine output** and introduce a minimal i18n layer (keep Russian as the default).
7. **Validate hardware assumptions** on a real SP-404MKII: button names, effect names, exported WAV behaviour (mono/48 kHz/length), and fix `text.py`/`courses.py` accordingly.
8. **Performance pass without redesign**: decode once and reuse, selector-based subscriptions / ref-based `stemTime`, send analysis by id instead of re-sending it, add cache eviction with a size setting.
9. **Add export features that fit the device**: pattern/recipe export (PDF/Markdown or MIDI), optional stereo stems, sample naming/length checks for the SP-404MKII.
10. **Single-source versioning and docs**: one version number across `package.json`/`tauri.conf.json`/sidecar, update `ROADMAP.md`/`ARCHITECTURE.md`, and remove or isolate dead code (`previewSource`, empty `beats` package, dev hooks).

---

## Verification note

This document was checked against the working tree at the stated commit: file paths, command names (`sidecar_start`, `sidecar_send`, `read_text_file`,
`write_text_file`, `read_stem_file`, `path_exists`, `autotest_path`), sidecar methods (`ping`, `probe`, `analyze`, `cancel`, `regrid`, `recipe`,
`courses`, `course`, `chop_plan`, `export_chops`, `models_status`, `models_download`, `cache_info`, `cache_clear`), screen list, test counts (22 Python, 2 TS),
cache filename scheme, storage locations and build scripts were confirmed by reading or grepping the source. Accuracy claims about analysis on real music are
explicitly **not** verified anywhere in the repository.
