# Architecture

```
React/TS UI (Vite) ──Tauri invoke/events──▶ Rust shell ──stdin/stdout JSON lines──▶ Python sidecar
   screens/ components/ state/                 src-tauri/src/lib.rs                    python/sidecar/server.py
                                                                                       ├─ engine/      (analysis)
                                                                                       └─ translator/  (SP-404 translation)
```

## Why a stdio sidecar
No ports, no firewall prompts, no server to leave running; the child dies with the app. Requests are
`{id, method, params}`, replies `{id, result|error}`, progress `{event:"stage", id, data}`. Packaged
builds ship a PyInstaller one-dir binary in app resources; dev builds run `python -m sidecar.server` from `.venv`.
Every request runs on its own thread so `cancel` can arrive mid-analysis (checked between stages).

## Pipeline (`engine/pipeline.py`)
prepare (ffprobe/ffmpeg → mono 22.05 kHz float) → tempo → stems → drums → bass → structure → recipe.
Each stage emits real `running/done/warn/skipped` events. Optional stages (stems, bass, structure) degrade to
warnings instead of failing the run. Results are cached by audio content hash + pipeline version.

- **tempo** – spectral-flux onset envelope → autocorrelation (+bar/beat harmonics) → phase-fold refinement →
  regression on detected hits → downbeat by low-frequency attack. Half/double readings are exposed as
  `grid.candidates`; the UI has ÷2 / ×2 and downbeat nudging. Constant-tempo model.
- **drums** – band-wise onset detection (low/mid/upper/high) → merge coincident bands into one hit → features of the
  *new* energy at the attack → `DrumClassifier` (heuristic-v1) → quantize → confidence filter.
- **quantizer** (`translator/quantizer.py`) – never destroys timing: each event keeps `time`, `quantized_time`,
  `timing_offset`, bar and step. Resolutions 1/4–1/32.
- **structure** – bar features (band energy, density, per-voice step occupancy) → novelty peaks → similarity clusters
  → rough labels (INTRO/BREAK/DROP/OUTRO). Approximate by design.
- **stems** – `engine/stems`: HT-Demucs at 44.1 kHz stereo → four mono parts (other → “lead”), saved as WAV in the cache and
  summarised (peaks, activity). Drums are transcribed from the drum stem plus low-confidence full-mix hits the stem pass missed;
  the grid is always fitted on full-mix hits.
- **bass** – `engine/bass/pitch.py`: YIN → median smoothing → note segmentation → amplitude-onset timing → grid step.
- **seams** – `engine/stems`, `engine/bass`, `engine/drums/classifier.py` define protocols with null/heuristic
  implementations so a real model can be dropped in.

## Translator (`translator/sp404/`)
`TrackAnalysis → SP404Recipe`: kit (pad ↔ voice), consensus 1-bar patterns A–D per section cluster, arrangement,
and a tutorial: ordered steps that each carry the full visible state (pad highlight + step grid). The UI is a pure
renderer of those steps. `learn.py` builds the Footwork course in the same schema from original patterns.
All Russian tutorial wording and SP button names are isolated in `text.py` / `tutorial.py`.

## Information architecture (UI)
Six areas — Home, Courses, FX Lab, Tricks, Track Lab, Reference. Track Lab wraps the full analysis workflow (Track · Stems · Drums · Bass · Structure · SP Recipe);
nothing in it was removed. Lessons (courses, track tutorials, FX Lab "Try this", Tricks) share **one renderer** (`screens/Tutorial.tsx`) and one step shape (`TutorialStep`),
with a simplified `DeviceDiagram` that lights the pads/controls a step talks about. Content for FX Lab / Tricks / Reference lives in `src/content/*` with `status` + Roland `sources`;
only `verified` items render. Course progress is stored locally (`lib/progress.ts`).

## Frontend
`state/store.ts` (tiny external store), `state/actions.ts` (all side effects), `components/` (SP404PadGrid is a strict
CSS-grid 4×4; StepSequencer is generic over voices/cells), `screens/`, `lib/audio/` (Web Audio synth voices +
lookahead sequencer; the preview plays the *current bar / pattern / lesson state*, so edits are heard immediately).

## Project format
`*.sp404learn` = JSON: track path (audio is *not* copied), waveform peaks, full analysis incl. manual edits, kit,
pattern edits, tutorial position. Re-opening needs no re-analysis.
