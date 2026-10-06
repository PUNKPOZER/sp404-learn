# MODEL_RESEARCH — models and libraries for Track Analysis Engine 2.0

Research only (2026-10-06). **Nothing was installed.** Genre/embedding candidates are compared in `GENRE_MODEL_RESEARCH.md`; this file covers stems, beats/downbeats, drums, key/harmony, bass, structure, vocals and the shared embedding.
Evidence legend: **[checked]** read from a primary source today (or verified on this Mac: `pip install --dry-run --only-binary=:all:` in the project venv, Python 3.14.3 arm64 — proves a binary wheel *resolves*, not that it *works*); **[reported]** from a search summary, re-read before deciding; **[measured]** by our harness; **[estimate]** my estimate, to be measured in the phase named.

Policy applied (brief §26): for every candidate, licence / model licence / size / RAM / CPU / Apple Silicon / offline / PyInstaller / maintenance. Unknowns are listed as unknowns.

## 0. Constraints that drive every choice

* App licence **MIT**, public repo; bundle today ≈ **580 MB** frozen (PyTorch + Demucs code); HT-Demucs weights are downloaded on first use (`THIRD_PARTY_LICENSES.md`). Every new dependency must keep `THIRD_PARTY_LICENSES.md` honest.
* Python **3.14.3** in the dev venv (the frozen sidecar uses the same). Packages with C-extensions that predate 3.14 are a real risk: **madmom failed to build its metadata on 3.14 here [checked: `pip` error "Failed to build 'madmom'"]**.
* Analysis currently: mix-only 2.0 s / track, with stems 13.4 s / track on Apple Silicon (MPS) for 3–4 min tracks **[measured, GENRE_BASELINE]**.
* **Copyleft:** AGPL-3.0 (Essentia library) must not be linked into the MIT app. Non-commercial (NC) model weights may be offered only as an optional, user-initiated download with the licence shown.

## 1. Stem separation

| Candidate | Code / weights licence | Weights size | Notes (quality = MUSDB18-HQ SDR in dB from a third-party table **[reported]**) | Verdict |
|---|---|---|---|---|
| **htdemucs** (current) | Demucs repo **MIT** [checked: THIRD_PARTY_LICENSES]; weights statement still *unverified* in `PROJECT_AUDIT §12.9` | ≈ 160 MB [reported] | baseline; drums/bass/other/vocals; MPS verified | **keep as FAST/default** |
| htdemucs_ft | MIT repo; fine-tuned bag of 4 models | ≈ 641 MB [reported] | vocals 9.19 · drums 10.11 · bass 10.38 · other 6.34; **≈ 4× slower** [reported] | candidate for optional **HIGH** mode; measure drums/bass gain vs 4× time (Phase A1) |
| htdemucs_6s | MIT | ≈ 105 MB [reported] | worse drums/bass than htdemucs_ft (9.54 / 9.11) | no (piano/guitar stems not needed) |
| mdx_extra (/_q) | MIT | ≈ 1.2 GB [reported] | drums 11.49 · bass 11.42 (best for rhythm section) but large/slow | measure only if HIGH needs more than _ft |

**Findings that matter more than model choice**

1. **Mono downmix.** `stems/io.save` and the pipeline's `resample_poly(...)` store stems as 16-bit 44.1 kHz **mono** and the analysis uses 22.05 kHz mono. Hi-hats above 11 kHz are invisible; stereo width (useful for classifying claps/hats, and for chop export quality) is lost. Plan: keep **stereo float32/16-bit stereo in the stem cache**, analyse from a 44.1 kHz mid + side pair, export mono only at the end (SP-404 loads stereo WAV; export option).
2. Do not choose "largest model": HIGH only if benchmarks (drum F1 / bass note accuracy on our private set) show ≥ X gain. Until a drum-label ground truth exists we cannot measure it — so HIGH mode stays **unimplemented**.
3. Cache: stems are the dominant cost (≈ 11 s of 13.4 s); they must be cached per `(file hash, model id, version)` and never recomputed for downstream changes (TRACK_ANALYSIS_V2_PLAN §Cache).
4. PyInstaller freeze of the sidecar has **not been verified locally** (hung twice earlier; see audit). Any new heavy dependency raises that risk → verify freeze on CI before adding.

## 2. Tempo, beats, downbeats, meter

| Candidate | Code licence | Weights licence / size | Py3.14 | Maintenance | Notes | Verdict |
|---|---|---|---|---|---|---|
| **Current** onset-flux autocorr + fold refinement + low-band downbeat | ours | — | ✔ | ours | constant tempo, fixed 4/4; confidence = fold variance / 1.5 (uncalibrated); half/double chosen by an ad-hoc `a2 ≥ 0.3·a1` rule; **3 of 10 footwork tracks resolved at 80 / 106.7 / 147.7 BPM [measured]** | keep as *one evidence source* + fallback |
| **Beat This!** (CPJKU, ISMIR 2024) | **MIT** [checked: README] | **MIT**, ≈ 78 MB (≈ 8 MB small variant) [checked] | `beat-this 1.1.0` resolves as a binary wheel [checked]; deps: PyTorch ≥ 2 (already bundled), `einops` (already), `soxr`, `rotary-embedding-torch`, `tqdm` | active (v1.1.0) | outputs **beats and downbeats without DBN post-processing** [checked]; 22 kHz mono input; README states no tempo-change/meter handling [checked]; reported best published F1 [reported] | **top candidate**: benchmark vs current on private set (Phase A2). Training data has mixed licences — read the README note before shipping |
| madmom (RNN/DBN) | BSD | **CC BY-NC-SA 4.0** models [checked: project page] | **metadata build fails on 3.14** [checked] | last release ~7 years ago [reported] | classic reference | **reject** (unmaintained + NC + 3.14) |
| Essentia `RhythmExtractor2013` / `BeatTrackerMultiFeature` | **AGPL-3.0** | n/a | wheel resolves [checked] | active | strong DSP, but AGPL | **reject for linking**; could be a *research-only* comparator on a dev machine |
| librosa `beat_track` / `tempo` | ISC | n/a | `librosa 1.0.0` resolves [checked] (+ numba dependency, large) | active | weaker than neural on electronic music [estimate] | optional dev baseline only; numba hurts packaging |
| All-In-One (mir-aidj) | MIT [reported] | download | unverified (needs `natten`) | moderate | joint beats + downbeats + **functional segments** | **needs review** — heavy build dependency; evaluate only as dev-time comparator for structure |

Tempo design (not new thresholds): produce **a ranked set of tempo hypotheses with a likelihood each** — {BPM × metrical level} — from (a) Beat This! beats, (b) the existing autocorrelation, (c) genre-conditioned prior (soft, from fusion), and **keep ½ / ×2 / ⅔ / 1.5× alternatives** visible. Output `tempoStability` (IBI variance) and a **tempo map** only when drift exceeds a threshold; otherwise keep the constant grid the SP sequencer needs (the SP-404 pattern sequencer is constant-BPM; a map is for explaining, not for exporting).

## 3. Drum transcription

| Candidate | Licence | Size / runtime | Notes | Verdict |
|---|---|---|---|---|
| **Current**: band flux onsets (low/mid/upper/high) + heuristic spectral-share classifier (`engine/drums`) | ours | trivial | thresholds tuned on synthetic drums (audit); multi-label per onset exists only via two special cases (kick+hat); confidence = strength × rule fit, **not calibrated** | keep onset stage; **replace the classifier behind the existing `DrumClassifier` protocol** |
| **ADTOF** (Zehren et al.) | dataset CC BY 4.0; GitHub repo **CC BY-NC-SA 4.0**; an ONNX conversion on HF is NC [checked/reported] | small CNN (size unchecked) | 5 classes (kick, snare, hi-hat, toms, cymbals); **no clap / open-vs-closed hat split** | **research comparator only** (NC; wrong classes for us). Do not ship |
| **Train our own small classifier** on per-onset features/patches, behind the same protocol | ours | tiny (≤ 1 MB) [estimate] | needs labelled drum onsets: **we have none**. Sources of labels: (1) the owner's drum stems + manual corrections in the app (corrections dataset!), (2) synthetic one-shot mixtures from the owner's own sample libraries, (3) permissively licensed drum datasets (licence check needed per dataset) | **recommended path**: build the labelled set from user corrections + synthetic mixtures, ship a tiny model, keep heuristics as fallback |

Design decisions already clear from the code: separate **onset detection** (existing `drums/onsets.py`, per band) from **classification**; emit a **list of labels with confidences per onset** (multi-layer events: KICK+HAT, SNARE+CLAP+HAT), allow `UNKNOWN/PERC` below a confidence floor, and store `strength` alongside `velocity`.

## 4. Breaks, groove, phrases (mostly DSP — no model)

* **Break detection**: bar-level self-similarity of drum-stem onset patterns (16-step × voice vectors) + repetition period detection → "REPEATING DRUM BREAK, 2-bar phrase, variation A/B". Needs only NumPy/SciPy. **Never claims sample identity.**
* **Groove**: swing ratio from inter-onset ratios of hat 16ths; microtiming = per-instrument offset distribution relative to the fitted grid (the app already stores `timing_offset` per event); syncopation = weighted off-beat share (the current definition, kept) + a metrical-weight (Longuet-Higgins/Lerdahl style) variant.
* **Phrases**: boundary candidates every 1/2/4/8/16 bars scored by novelty + repetition + fill density; bar grid from downbeats.

No new dependency. Measure on the private set once labels exist.

## 5. Key and harmony

| Candidate | Licence | Notes | Verdict |
|---|---|---|---|
| Essentia `KeyExtractor` (EDMA/Bgate profiles trained on dance music) | **AGPL** | likely best for electronic music [reported]; cannot link | reject for linking |
| **Own chroma + key profiles** (CQT/STFT chroma from the **bass + other stems**, Krumhansl–Kessler and an EDM-oriented profile from the literature) with NumPy/SciPy | ours | no dependency; return **top-2 keys with confidences and relative/parallel ambiguity** ("F♯ minor / A major"); `tonal vs percussive` from chroma flatness; harmonic loop length from chroma self-similarity (bar-synchronous) | **recommended**; accuracy unknown until key truth exists in the manifest (the schema already accepts `key`) |
| CNN key models | unclear | no clear permissive checkpoint found | not now |

Sub-bass note: low-register pitch/chroma is unreliable below ~50 Hz → weight chroma by the "other" stem and bass harmonics, not the sub fundamental.

## 6. Bass engine

Keep YIN (`bass/pitch.py`) as **one signal**; add: pYIN-style voiced probability and octave-error check against the second-harmonic template; onset from amplitude + transient envelope; note duration; classify **SUB / TONAL / PERCUSSIVE** from spectral centroid, harmonicity and envelope; **`UNKNOWN PITCH`** instead of inventing notes when voicing < threshold. Uses the bass stem (stereo-preserving pipeline above). No new dependency needed to start; evaluate `torchcrepe`-style models only if the DSP route plateaus (licence/size unchecked → **needs review**).

## 7. Structure, phrases, vocals

* **Structure**: replace the single 4-bar novelty detector with a bar-synchronous **self-similarity matrix** over fused features (energy bands, onset-pattern vectors, per-stem activity, chroma, optionally the EffNet embedding) → checkerboard novelty + repetition clustering → neutral ids (A, B, C, A′) first; semantic roles (INTRO / DROP / BREAK / OUTRO) only when confidence is high. Pure NumPy. The embedding (if the Genre Pack is installed) adds timbral similarity but is **optional**.
* **Vocal activity**: frame RMS gating on the vocal stem + hysteresis → segments, density, phrase boundaries (already partly present as `activity_fraction`). Residual Demucs bleed means thresholds need calibration per track (relative to the stem's own noise floor).
* **Chop opportunities / loopability**: scoring functions over the above (boundary alignment to beats, onset/transient quality at start, amplitude/spectral discontinuity across the loop seam via cross-correlation of 20–50 ms at both ends, phrase completeness) — DSP only.

## 8. One embedding layer

Recommendation: **a single optional embedding model — Discogs-EffNet (1280-d)** — reused for genre, timbral similarity, and section comparison. Do **not** add MERT / CLAP / PANNs in parallel (NC or unverified licences, size, and no labelled data to exploit them). If the Genre Pack is absent, similarity/sections fall back to the DSP features above and the genre block shows only the low-confidence rhythm hint.

## 9. Dependency summary (what would be added, if approved)

| Package | Purpose | Licence | Py3.14 | Size impact | Phase |
|---|---|---|---|---|---|
| `onnxruntime` 1.30.0 | run Discogs-EffNet / genre head | MIT [reported] | binary wheel resolves [checked] | tens of MB [estimate; measure] | G2 |
| `beat-this` 1.1.0 (+`soxr`, `rotary-embedding-torch`) | beats/downbeats | MIT [checked] | binary wheel resolves [checked] | package small; **checkpoint 78 MB** (or 8 MB small) | A2 |
| `soundfile`/`soxr` (resampling, stereo I/O) | I/O | BSD / LGPL-2.1+ [reported] | unchecked | small | A1 — check LGPL (dynamic link) before use |
| *(none)* | key, groove, break, phrases, structure, chop/loop scoring | — | — | — | A3–A7 (NumPy/SciPy only) |

Rejected outright: madmom, Essentia (library), MERT, ADTOF (as shipped component), librosa (numba weight) — reasons above.

## 10. Estimated cost of the full pipeline (estimates; measured numbers are marked)

| Stage | Time / 4-min track, Apple Silicon | Disk / RAM |
|---|---|---|
| Decode + STFT (current) | ≈ 1 s **[measured: whole mix-only run = 2.0 s]** | RAM ≈ 100 MB STFT |
| HT-Demucs (current, MPS) | ≈ 11 s **[measured: 13.4 s total with stems]** | stem cache ≈ 125 MB mono; **≈ 250 MB if stereo** [estimate] |
| Beat This! | ≈ 3–8 s [estimate] | 78 MB weights; RAM < 1 GB [estimate] |
| EffNet embeddings + head | ≈ 1–3 s [estimate] | 20 MB weights |
| Drum classifier v2, groove, break, phrases, structure v2, key, chop scoring (DSP) | ≈ 3–6 s total [estimate] | negligible |
| **Total BALANCED (stems + beats + embeddings + DSP)** | **≈ 25–35 s** [estimate] | |
| QUICK (cache hit / mix-only DSP) | ≈ 2–4 s | |
| DEEP (htdemucs_ft + extras) | ≈ 60–90 s [estimate, 4× stems] | +640 MB weights |

Distribution impact: **DMG + ~0 MB** (Genre Pack, Beat This! checkpoint and HIGH-quality stems are *downloads*, like the current Demucs weights); the `onnxruntime` + `beat-this` Python packages add tens of MB to the frozen sidecar [estimate]. The unresolved PyInstaller-freeze reliability is the larger risk.

## 11. Open questions for approval

1. Decision **D1** (NC licence of Discogs-EffNet): optional download acceptable? (recommended)
2. Is a **private labelled set** coming (≥ 5 tracks/genre; some with BPM/key/sections/drums)? Without it, no module can be *proven* better and per-module replacement stays "evidence-pending".
3. Stereo stem cache (≈ 2× disk) — OK?
4. Is adding Beat This! (MIT, +78 MB checkpoint, +3–4 pure-Python deps) acceptable if it wins the benchmark?
