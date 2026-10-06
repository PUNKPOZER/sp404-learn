# GENRE_MODEL_RESEARCH — local genre / embedding options for SP-404 LEARN

Status: **research only — nothing here is installed or wired into the app.** Written 2026-10-06 for approval.
Companion documents: `MODEL_RESEARCH.md` (beat / stems / drums / key), `TRACK_ANALYSIS_V2_PLAN.md`, `LEARN_V2_IMPLEMENTATION_PLAN.md`, `GENRE_BASELINE.md`.

How facts were gathered. Items marked **[checked]** were read from the primary source on 2026-10-06 (Essentia model index + model JSON, project READMEs, PyPI dry-run on this Mac with Python 3.14.3).
Items marked **[reported]** come from search-result summaries of project pages and must be re-read before a decision is final. Items marked **[estimate]** are my engineering estimates and are **not measured**; Phase 2 measures them.

---

## 1. What we need

* Ranked genre candidates with honest confidence, local and offline, usable on a laptop in a few seconds per track.
* Useful for: Footwork/Juke, Jungle, Drum & Bass, UK Garage / 2-Step, Breakbeat, House, Techno, Hip-Hop, Ambient (+ a few neighbours).
* One reusable **embedding** that can later serve similarity / section comparison (MODEL_RESEARCH §Embeddings), so we do not load several large networks that encode the same thing.
* Must not make the app depend on a cloud API. Must tolerate being absent (graceful fallback).
* Distribution reality: SP-404 LEARN is MIT-licensed and published on GitHub; the DMG currently bundles PyTorch + Demucs code (~580 MB frozen), and downloads HT-Demucs weights on first use.

## 2. Candidate comparison

Columns follow the 12 criteria requested. "Py3.14" = `pip install --dry-run --only-binary=:all:` on this machine's venv (Python 3.14.3, Apple Silicon) **[checked]** — it proves a binary wheel resolves, **not** that the package works.

| | **Discogs-EffNet** (+ `genre_discogs400` head) | **MAEST** (Discogs transformer, same 400 styles) | **Essentia library** (runtime for the above) | **MTG-Jamendo genre/mood heads** | **MERT-v1** (95M / 330M) |
|---|---|---|---|---|---|
| 1 Library licence | Model is run by Essentia or ONNX Runtime (below) | Hugging Face / `maest-infer` packaging [reported] | **AGPL-3.0** [checked: PyPI/GitHub]; commercial licence on request | Heads run on Essentia embeddings | MIT-style code [reported] |
| 2 **Model licence** | **CC BY-NC-SA 4.0**, proprietary licence from MTG on request [checked: models.html] | **CC BY-NC-SA 4.0** [reported] | n/a | CC BY-NC-SA 4.0 (same site) | **CC BY-NC 4.0** [reported] |
| 3 Redistribution | NC + share-alike: **we may not bundle it in a commercial product; ShareAlike would apply to derived weights.** Download-on-demand from MTG's server is what the user's own project `noesis` already does | same | AGPL: linking the library into our app would make the app AGPL-compatible-or-else | same | NC |
| 4 Size | backbone **18.0 MB** (`discogs-effnet-bsdynamic-1.onnx`, 18,027,718 B) + head **2.06 MB** `.pb` [checked] | head 1.25 MB `.onnx` [checked]; backbone size not read (PASST-style transformer — **unchecked**) | wheel size unchecked | small | 95M–330M params (≈ 0.4–1.3 GB fp32) [estimate] |
| 5 Runtime deps | ONNX Runtime **or** TensorFlow via essentia-tensorflow; needs a mel front-end (16 kHz, 96 mel, 128-frame patches [reported]) — Essentia's front-end can be re-implemented in NumPy (done in `noesis`) | PyTorch (already present for Demucs) | C++ lib + Python bindings | as left | PyTorch + transformers |
| 6 CPU speed | EfficientNet-B0: light [estimate: ~1–3 s for a 4-min track on CPU, patch-batched] | heavier than EffNet [estimate] | — | light | slow on CPU [estimate] |
| 7 Apple Silicon | ONNX Runtime CPU/CoreML EP [reported]; `essentia-tensorflow` osx-arm64 wheel exists but there is an open issue about a missing `essentia.tensorflow` submodule on macOS ARM [checked: GitHub issue #1486] | torch MPS | wheel resolves (arm64) | | torch MPS |
| 8 Offline | yes after one download | yes | yes | yes | yes |
| 9 Python integration | easy via `onnxruntime` — **`onnxruntime-1.30.0` resolves as a binary wheel on Py3.14** [checked]; `essentia`/`essentia-tensorflow 2.1b6.dev1438` also resolve [checked] (the user's `noesis` notes said "no wheels for 3.14" earlier — that is now stale or was about a different build; re-verify by importing, not by resolving) | `maest-infer` on PyPI [reported] | | | HF `transformers` |
| 10 Taxonomy | **400 Discogs styles [checked, verbatim list]** incl. `Electronic---Juke`, `Jungle`, `Drum n Bass`, `UK Garage`, `Speed Garage`, `Breakbeat`, `Breaks`, `Big Beat`, `House`, `Deep House`, `Acid House`, `Techno`, `Ambient`, `IDM`, `Dub`, `Trip Hop`, `Grime`, `Halftime`, `Ghetto House`, `Jumpstyle`, `Bassline`, and `Hip Hop---Boom Bap`, `Hip Hop---Instrumental`, `Hip Hop---Hip Hop`. **There is no `Footwork` and no `2-Step`.** | identical 400 labels | — | 87 generic Jamendo tags (rock/pop-oriented; poor for our targets) [estimate] | none (embedding only) |
| 11 Usefulness for our genres | High for Jungle / DnB / UKG / Breakbeat / House / Techno / Ambient / Hip-Hop; **Footwork must come from `Juke` + `Ghetto House` + our own rhythm features; 2-Step from `UK Garage`/`Speed Garage` + rhythm** | Same labels; paper reports it competitive on downstream tasks [reported] | — | low | unknown until a head is trained; **we have no labelled data** |
| 12 Packaging impact | +20 MB model (downloaded, not bundled) + `onnxruntime` wheel (tens of MB [estimate]; measure) | + torch weights; larger | **AGPL: avoid linking** | — | very large |

Published quality (from the model's own metadata, **[checked]**): `genre_discogs400-discogs-effnet-1` reports **ROC-AUC 0.954, PR-AUC 0.206** on its Discogs test set. PR-AUC 0.2 across 400 fine-grained, overlapping styles means: use it as a **ranking signal**, not as an authoritative label — which is exactly the hybrid role proposed below.

## 3. Licence consequence (needs a decision from the owner — D1)

All strong local genre models found carry **non-commercial** weights (CC BY-NC-SA 4.0 / CC BY-NC 4.0). Options:

1. **Optional "Genre Pack"** (recommended): the app works without it (current heuristics, shown as low-confidence "style hint"); the pack (≈ 20 MB) is downloaded on user request from MTG's own server (like HT-Demucs weights today), with the licence shown at download time. The project stays free/non-commercial. Nothing is bundled in the DMG. ShareAlike is satisfied by not redistributing modified weights.
2. **Ask MTG for a commercial licence** if the product ever becomes commercial.
3. **Train our own head** on our own labelled data — impossible today (no dataset) and the embedding itself would still be NC.
4. **No ML genre** — rely on rhythm heuristics only. Rejected: that is the current, unreliable state.

The Essentia **library** is AGPL-3.0: do **not** link it. Run the ONNX files with `onnxruntime` (MIT) and re-implement the mel front-end in NumPy (algorithmically simple; the user's `noesis` repo already contains a NumPy port — to be reviewed for reuse; same owner, MIT).

## 4. Recommendation

**Primary candidate: Discogs-EffNet (ONNX) embeddings + `genre_discogs400` head, run with `onnxruntime`, as an optional download.**
Reasons: smallest model (≈ 20 MB), the only candidate that already contains most of our taxonomy, 1280-d embedding reusable for similarity/section comparison, simple deterministic pre-processing, offline.
**Second candidate for a bake-off in Phase 2: MAEST-30s-pw** (same labels, transformer, possibly better ranking, heavier). Decide by the benchmark, not by reputation. Do **not** add MERT/CLAP-style models: no genre head, NC licence, large, and we have no labelled data to train a head.

## 5. Mapping Discogs styles → our taxonomy (draft)

Our labels are the 16 in `python/bench/taxonomy.py` (+ `unknown`). The classifier outputs 400 probabilities; we **aggregate** them.

| Our label | Discogs styles that vote for it | Notes |
|---|---|---|
| jungle | Jungle (+ Breaks, Ragga? — unchecked) | |
| drum_and_bass | Drum n Bass | related families: Breakbeat, Jungle |
| breakbeat | Breakbeat, Breaks, Big Beat, Progressive Breaks, Broken Beat | |
| uk_garage | UK Garage, Speed Garage, Bassline, Garage House(?) | verify "Garage House" is US garage, not UKG → do not vote |
| two_step | UK Garage + rhythm evidence (kick not on 2/3/4, shuffle) | **no direct label** — derived by fusion |
| footwork | Juke, Ghetto House, Jumpstyle(?) **+ 150–165 BPM + rhythm evidence** | **no direct label** — derived by fusion; this is the main risk |
| juke | Juke | |
| house / deep_house / acid_house | House, Deep House, Acid House (+ Tech House, Progressive House as `house` family) | |
| techno / acid_techno | Techno, Deep Techno, Hard Techno, Minimal Techno / Acid (+ Techno) | |
| hip_hop / boom_bap / instrumental_hip_hop | Hip Hop---Hip Hop / Boom Bap / Instrumental | |
| ambient | Ambient, Dark Ambient, Drone, Illbient | |

The aggregation table lives in data (JSON), not code, so it is testable and editable.

## 6. Hybrid fusion design (to be built in Phase 2, not now)

```
audio ──► 16 kHz mono windows ──► Discogs-EffNet embedding (1280-d) ─┬─► genre head → 400 probs → taxonomy aggregation ─┐
                                                                     └─► (kept: reused for similarity / sections)       │
existing analysis ─► tempo candidates (+½/×2), kick/snare/hat pattern features, syncopation, break repetition,            ├─► FUSION ─► GenrePrediction
                      bass behaviour, structure, onset density ───────► rhythm evidence per genre (soft likelihoods) ────┘
```

* **Fusion form**: log-linear combination `score_g = w_m · log p_model(g) + Σ_k w_k · log L_k(g | feature_k)`, softmax-normalised, then **temperature-calibrated** on the benchmark so that "72 %" is roughly right 72 % of the time. Weights live in a config file with defaults and are unit-tested (property tests: a strong model prediction cannot be flipped by a single weak heuristic; removing the model degrades gracefully to rhythm-only with a confidence cap).
* **Rhythm evidence** is soft (likelihoods, e.g. a BPM *distribution* per genre with wide overlapping modes and half/double handling), never `if bpm > X`.
* **Uncertainty**: if top-1 < 0.45 or (top-1 − top-2) < 0.10 → return `UNKNOWN / HYBRID` with the top candidates ("Breakbeat 38 % · UK Garage 34 % · Jungle 19 %"). Families (`uk_breaks`) are reported alongside genres so that "UK breaks family" can be shown when siblings are tied.
* **Output schema** (`GenrePrediction`): `primaryGenre`, `primaryConfidence`, `candidates[{genre, confidence, family}]`, `family`, `status: "confident"|"hybrid"|"unknown"`, `characteristics[]`, `evidence[{source, genre, weight, text}]`, `modelVersions`, `fusionConfigHash`. Confidence is shown as bands ("likely", "possible"), and as a percentage only when calibrated on the benchmark (no false precision).
* **User correction** is stored as a separate record (`rawPrediction` kept) in a local JSONL dataset; it updates the project immediately and drives recommendations; **no automatic retraining**.

## 7. Evaluation plan (what makes this claim-worthy)

1. **Benchmark first** (built, see `python/bench/`): top-1, top-3, family accuracy, per-genre accuracy, confusion matrix, low-confidence list; manifests point at local files only.
2. **Baseline recorded** in `GENRE_BASELINE.md` — and it is **weak evidence**, because the only labelled material available locally is ten footwork tracks (one class → no false-positive measurement). To approve Genre Engine 2.0 we need a **private set of ≥ 10 tracks per target genre** (≈ 100 tracks). I cannot fetch copyrighted audio; the owner supplies it. A minimum viable set: 5 per genre × 10 genres.
3. **Ablations** on the same set: rhythm-only (current) vs model-only vs fusion; EffNet vs MAEST; with/without stems as input; window count and position (30 s centre vs whole-track mean).
4. **Acceptance criteria for replacing the current classifier**: fusion Top-1 ≥ baseline + 15 points *and* Top-3 ≥ 90 % *and* calibrated confidence error ≤ 0.1 on the held-out set, with the footwork recall not worse than baseline. Otherwise do not ship.

## 8. Risks

* **Footwork/2-Step have no Discogs label** → rely on fusion; may land as `Juke`/`Ghetto House`/`UK Garage` + rhythm. Mitigation: treat footwork and juke as one family, give both as acceptable in the benchmark.
* NC licence (D1). Mitigation: optional download, no bundling, clear notice.
* ONNX export of the mel front-end mismatches Essentia's by small numerical differences → verify embeddings against Essentia on a sample before trusting the head (unit test with stored reference vectors).
* Over-trusting 400-way fine styles → aggregate to our 16 labels and cap confidence.
* Python 3.14 is new: `onnxruntime` resolves, but import/run on the **frozen PyInstaller sidecar** must be tested early in Phase 2 (PyInstaller hooks for onnxruntime).

## 9. What this document does not claim

No accuracy figure for any candidate on our target genres has been measured. The only number below the line is the **current heuristic baseline on 10 footwork tracks** (see `GENRE_BASELINE.md`), which cannot measure false positives.

## Sources

* Essentia models index and licence: <https://essentia.upf.edu/models.html> · Discogs-EffNet files: <https://essentia.upf.edu/models/feature-extractors/discogs-effnet/> · genre head files/classes: <https://essentia.upf.edu/models/classification-heads/genre_discogs400/>
* Essentia library licence / wheels: <https://github.com/MTG/essentia> · <https://pypi.org/project/essentia-tensorflow/> · <https://github.com/MTG/essentia/issues/1486>
* MAEST: <https://github.com/palonso/MAEST> · <https://huggingface.co/mtg-upf/discogs-maest-30s-pw-129e>
* MERT: <https://huggingface.co/m-a-p/MERT-v1-330M>
* The owner's own Discogs-EffNet usage notes (NumPy front-end, ONNX path, model mirror): <https://github.com/PUNKPOZER/noesis>
