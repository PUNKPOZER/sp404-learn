# TRACK_ANALYSIS_V2_PLAN — Track Analysis Engine 2.0 (phase 1: map, diagnose, plan)

Status: **planning + evaluation infrastructure only.** The production analysis engine is unchanged (the only edits in this phase are *new* files under `python/bench/`, `python/tests/test_bench.py`, docs, and two lines in `.gitignore`).
Evidence tags: **[code]** read in this repo today · **[measured]** by the new harness on the owner's 10 local footwork tracks (`GENRE_BASELINE.md`) · **[hypothesis]** reasoned, not yet tested · **[estimate]**.
Related: `MODEL_RESEARCH.md`, `GENRE_MODEL_RESEARCH.md`, `LEARN_V2_IMPLEMENTATION_PLAN.md`, `PROJECT_AUDIT.md`.

---

## 1. The current pipeline, as it really is [code]

```
decode(22.05 kHz mono) ─► STFT magnitude (hop 128, 513 bins) ─► tempo.estimate_grid ─► (full-mix 44.1k stereo → mix.wav)
  ─► HT-Demucs (44.1k stereo in → 4 stems → each saved MONO 16-bit) ─► drum onsets+classifier on DRUM stem (+ missed hits from the mix, ×0.7)
  ─► grid.refine_with_onsets (kick/snare/clap fit) ─► pick_downbeat (low-band attack, mod 4) ─► shift bar 1 to first event
  ─► bass YIN on BASS stem ─► structure.segment(mix STFT, events) ─► characteristics.measure ─► likely_styles (6 rules)
  ─► cache JSON per (file hash, PIPELINE_VERSION "3", resolution, "stems"|"mix") ─► recipe/tutorial built later from events+bass+sections
```

Stage cost [measured on 3–4 min tracks, Apple Silicon]: whole pipeline **2.0 s** without stems, **13.4 s** with HT-Demucs (MPS). Output model: `TrackAnalysis` (grid, events, bass, sections, characteristics, likely_styles, warnings, stems meta).

## 2. Why each stage fails on real music

| Stage | Mechanism today [code] | Failure on real music | Evidence |
|---|---|---|---|
| **Decode / features** | everything analysed at **22.05 kHz mono**; stems stored mono | Hat/air content > 11 kHz lost; clap/hat/open-hat separation weakens; stereo cues lost | [code]; the audit already lists it |
| **Tempo** | onset-flux autocorrelation (+bar multiples), broad prior around 125 BPM, ad-hoc "if the slow reading < 90 and the double is ≥ 30 % as periodic → take double", fold-variance refinement | picks one metrical level; polyrhythmic/triplet-feel material lands on ⅔ or ½; confidence = fold variance / 1.5 (not a probability); constant tempo | **[measured]** F03 → 80, F08 → 106.7, F10 → 147.7 BPM among tracks that are footwork (expected ≈ 160; no BPM truth yet) |
| **Downbeat** | sum of low-band attacks on each of 4 beat phases | wrong when the intro has no kick or when kicks sit off the beat (footwork, UKG); no confidence; fixed 4/4 | [hypothesis] — needs beat/downbeat truth |
| **Drum onsets** | log-spectral flux per band, adaptive threshold, 30 ms clustering | dense rolls (footwork/jungle 16th+ rolls) merged by `min_gap` 35 ms; ghost hits under thresholds; threshold constants hand-tuned on synthetic audio | [code]; [hypothesis] on real recall |
| **Drum classification** | spectral energy shares of the *new* energy at the onset → rule list | rules calibrated on synthetic drums; clap vs snare vs perc depends on shares; no learned model; confidence is `strength × rule fit`, uncalibrated; multi-label only via kick+hat special case | [code] |
| **Bass** | YIN 28–330 Hz, median filter, segmentation | sub-bass (< 50 Hz sine) pitch octave errors; no "unknown pitch"; mono voice; notes before bar 1 dropped | [code] |
| **Structure** | 4 bar-features (3 bands + onset count) + 48 pattern-bits per bar, 4-bar windowed novelty, greedy clusters at distance 0.9, semantic labels from energy percentiles | labels INTRO/DROP/BREAK/OUTRO decided by arbitrary percentiles; max 4 cluster letters; no repetition model (A vs A′ not related); boundary quantised to bars of a possibly wrong grid | [code] |
| **Genre** | 6 rules on BPM / syncopation / hats / four-on-floor | answer is a function of the tempo answer; Footwork vs Jungle/DnB differ by ≤ 0.03 in 5 of 10 tracks; uncalibrated scores; 6 outputs only | **[measured]** `GENRE_BASELINE.md` (70 % top-1, all 3 misses tempo-driven or near-ties) |
| **Key / harmony** | none | not implemented | audit |
| **Groove** | `syncopation`, `timing_variation_ms` only | no swing, no per-instrument displacement, no hat timing | [code] |
| **Vocal activity** | fraction of bars with vocal-stem energy | no segments/boundaries/phrase; bleed not handled | [code] |
| **Chops / loops** | chop *planning* exists for stems (`chop.py`: bars/phrases/hits) | no scoring of *good* candidates, no loop-seam analysis | [code] |
| **Cache** | one JSON; `PIPELINE_VERSION` bump invalidates everything; stems cached separately | changing any downstream rule re-runs Demucs unless the stems dir hit is reused (it is not keyed by stage) | [code] |
| **Confidence** | each module invents its own scale | nothing is comparable or calibrated; UI shows numbers as if probabilities | [measured] F05 is wrong at 0.88 (the run's highest score) |

**Key diagnostic result:** improving the drum stage alone will not fix genre — stems left the genre top-1 unchanged on all 10 tracks [measured]. Tempo ambiguity and the absence of a real musical-similarity signal are the bottlenecks.

## 3. Target architecture

```
TRACK ─► [0 preprocess: decode 44.1k stereo, loudness, quality flags (clipping, mono-compat, silence)]
        ├─► [1 stems  : HT-Demucs FAST (default) | HIGH optional]          ─► cache: stems/<hash>/<model>-<ver>/
        ├─► [2 rhythm : beats/downbeats (Beat This!) + onset-flux tempo hypotheses] ─► cache: tempo-<ver>.json
        ├─► [3 drums  : onset detect (stem) → classifier v2 → multi-label events]   ─► cache: drums-<ver>.json
        ├─► [4 bass   : stem-based pitch/segments/type]                             ─► cache: bass-<ver>.json
        ├─► [5 harmony: chroma/key/tonal-stability/harmonic loop]                   ─► cache: harmony-<ver>.json
        ├─► [6 embed  : (optional pack) EffNet 1280-d per window]                   ─► cache: embed-<ver>.npy
        ├─► [7 structure: bar-synchronous self-similarity, repetition, phrases]     ─► derived (cheap), cache anyway
        ├─► [8 vocals/chops/loops/groove/breaks: derived scores]                    ─► derived
        └─► [9 genre  : model probs + rhythm evidence → calibrated fusion]          ─► derived (cheap; weights configurable)
                         ▼
                 ANALYSIS FUSION (reconciles hypotheses; keeps raw alternatives)
                         ▼
                 TrackUnderstanding (single schema, §4)  ─► SP Recipe ─► Learn This Track
```

Design rules: (1) each stage is a **pure function** `(inputs, params) → StageResult` with `{value, confidence, alternatives, evidence, version}`; (2) stages declare their **inputs** (so the cache knows what to invalidate); (3) fusion is **separate and cheap** — it never re-runs a heavy stage; (4) every module has a **fallback** (stage failure → warning + lower confidence, never a crash: the existing "optional stage degrades" behaviour); (5) the existing modules become **baseline implementations** behind the same stage interface and are replaced only when the benchmark says so.

## 4. `TrackUnderstanding` schema (proposal; JSON, versioned)

```jsonc
{
  "schema": 2,
  "file":   { "hash": "…", "duration": 231.9, "sampleRate": 44100, "channels": 2 },   // objective: no confidence
  "quality":{ "clipping": false, "silenceFraction": 0.01, "monoCompatible": true },
  "tempo": {
    "bpm": 160.0, "confidence": 0.82,
    "alternatives": [ {"bpm": 80.0, "relation": "half", "confidence": 0.55}, {"bpm": 106.7, "relation": "2/3", "confidence": 0.20} ],
    "stability": 0.93, "tempoMap": null,                          // present only if drift is real
    "meter": {"value": "4/4", "confidence": 0.9},
    "beats": "ref:beats.json", "downbeats": "ref:beats.json", "beatConfidence": 0.88
  },
  "groove":  { "swing": {"value": 0.57, "confidence": 0.7}, "syncopation": {"level": "high", "value": 0.72},
               "timing": "loose", "kickDisplacement": "strong-offbeat", "hatTiming": {"meanOffsetMs": 6, "spreadMs": 11} },
  "genre":   { "primary": "footwork", "primaryConfidence": 0.61, "status": "confident|hybrid|unknown",
               "family": "footwork", "candidates": [ {"genre":"footwork","confidence":0.61}, {"genre":"jungle","confidence":0.18} ],
               "evidence": [ {"source":"model","text":"Juke 0.44"}, {"source":"tempo","text":"160 BPM region"} ] },
  "key":     { "value": "F# minor", "confidence": 0.81, "alternatives": [ {"value":"A major","relation":"relative","confidence":0.12} ] },
  "harmony": { "loopBars": {"value": 4, "confidence": 0.7}, "changeDensity": "low", "tonalness": 0.74, "stability": 0.8 },
  "drums":   { "events": [ {"id":"e1","time":12.481,"bar":7,"step":4,
                            "labels":[{"type":"SNARE","confidence":0.91},{"type":"CLOSED_HAT","confidence":0.64}], "strength":0.78} ],
               "breaks": [ {"startBar":9,"bars":2,"role":"base","repeats":6,"confidence":0.83}, {"startBar":17,"bars":2,"role":"variationA","confidence":0.7} ] },
  "bass":    { "type": "sub|tonal|percussive", "notes": [ {"time":3.1,"midi":30,"pitch":"known|unknown","confidence":0.8,"duration":0.21} ] },
  "structure":{ "sections": [ {"id":"S1","start":0,"end":24.0,"identity":"A","role":"intro","roleConfidence":0.6,"relatedTo":null},
                              {"id":"S3","start":48.0,"end":64.0,"identity":"A′","relatedTo":"S2","similarity":0.91} ],
               "phrases": {"lengthBars": 8, "confidence": 0.75, "nextMajorChangeBar": 17} },
  "vocals":  { "present": true, "density": 0.31, "segments": [ {"start":43.2,"end":44.1,"confidence":0.8} ], "chopOpportunities": 3 },
  "chopCandidates": [ {"type":"vocal|drum_break|melodic|texture|bass|loop","start":43.2,"end":44.1,"score":0.89,"loopability":null,"reasons":["clear boundaries","low overlap"]} ],
  "stems":   { "model":"htdemucs","quality":"fast","stereo":true },
  "versions":{ "pipeline":"2.0.0","stages":{"tempo":"2.1","drums":"2.0","bass":"2.0","genre":"fusion-0.3"} },
  "corrections": { "bpm": {"raw": 174.2, "user": 172, "at": "2026-10-06T18:00:00Z"} }      // never overwrites raw values
}
```

`TrackAnalysis` (existing, schema v1, projects `.sp404learn` version 1) stays loadable: a **converter** maps v1 → the v2 view (missing blocks = absent, confidence = null) so that old projects keep working; saving a v1 project never silently upgrades without the user's action.

## 5. Confidence handling

* **What gets confidence:** BPM, meter, beats, key, genre candidates, each drum label, each bass note (and pitch-known flag), section boundary and role, chop candidates, loopability. **No confidence for objective metadata** (duration, sample rate, channels).
* **Meaning:** a confidence is a **calibrated probability of being right**, estimated on the benchmark (reliability curves; temperature/Platt scaling per module). Until a module is calibrated it is flagged `calibrated:false` and shown only as a band, never a percentage.
* **Bands (UI):** HIGH ≥ 0.75 — normal presentation · MEDIUM 0.5–0.75 — subtle "likely" marker · LOW < 0.5 — show alternatives or UNKNOWN; **LOW never feeds authoritative tutorial instructions** (the Recipe/Learn-This-Track generators take a `minConfidence` and drop or soften the instruction: "check this by ear").
* **Fusion rules:** modules emit **hypotheses with likelihoods**; fusion multiplies in log space (§Fusion), keeps the runner-up, and sets final confidence = calibrated posterior capped by the weakest *critical* evidence (e.g. tempo confidence caps the confidence of everything that depends on the grid).
* **Corrections:** user values are stored next to raw values (`corrections`), applied first by the recipe/lesson generators, and appended to a local dataset (JSONL: file hash, stage, raw, user, time, app version) for future evaluation — **no automatic retraining**.

## 6. Cache (stage-keyed, versioned)

```
cache/<fileHash>/
  meta.json                 (file facts, schema)
  stems/<model>-<ver>/…     (stereo wav stems)         ← only re-run when the model/version changes
  tempo-<ver>.json   beats-<ver>.json   drums-<ver>-<stemsKey>.json   bass-<ver>-<stemsKey>.json
  harmony-<ver>.json   embed-<ver>.npy   structure-<ver>-<gridKey>.json
  understanding-<fusionConfigHash>.json                  ← cheap; regenerated when only fusion weights/config change
```

* Key = stage version + the hash of **its declared inputs' keys**. Changing fusion weights, genre mapping or UI never invalidates audio-derived stages. Changing the tempo grid invalidates grid-dependent stages (drums quantisation, structure) but **not stems/embeddings**.
* The legacy `…-v3-r16-{stems|mix}.json` cache stays readable for a migration window; `Cache.clear` becomes per-track/per-stage and the cache gets a size cap (audit §12.12).

## 7. Debug view and exports

* **Developer/debug mode** (hidden behind Settings → Developer; not the beginner UI): raw tempo hypotheses, beats/downbeats overlaid on the waveform, drum events with all labels and confidences, bass notes + pitch-known flags, section boundaries with the self-similarity matrix, genre probabilities (model vs rhythm contributions), chop/loop scores with reasons, model/stage versions, timings.
* **`analysis-debug.json`**: the full `TrackUnderstanding` + raw stage outputs + versions + timings + the user's corrections — enough to reproduce an error report without the audio.

## 8. Real-music evaluation (built in this phase)

* **Code** (new, dev-only): `python/bench/{taxonomy,manifest,metrics,systems,run}.py`; tests `python/tests/test_bench.py` (6 tests; whole suite 30 passed).
* **Manifest** (`python/bench/manifest.example.json`): per track `path` (or `track`) + `expected` either `["jungle","drum_and_bass"]` or `{ "genre":[…], "bpm":[lo,hi]|n, "meter":"4/4", "key":"F# minor", "beats":[…], "downbeats":[…], "drums":[{"time","type"}], "sections":[…] }`. **Any field may be missing**; a metric is computed only where truth exists. Local manifests and results are git-ignored; **no audio is ever committed**.
* **Metrics**: genre Top-1 / Top-3 / family / per-genre / confusion matrix / low-confidence list; BPM Acc1 and Acc2 (octave-tolerant, with the octave-error kind); beat F-measure (±70 ms); key score (MIREX weights); drum precision/recall/F1 per class (±50 ms, one-to-one); section-boundary median error and hit-rate (±3 s).
* **Systems registry**: `current-mix`, `current-stems` registered today; V2 modules register the same way and are scored by the same code and the same manifest.
* **Baseline** run on the 10 local footwork tracks: `GENRE_BASELINE.md`. Honest limit: no BPM/beat/key/section/drum truth exists locally, so those metrics are implemented and unit-tested but **not yet run on real data**.

## 9. Recommendation: keep / upgrade / replace

| Module | Decision | Why / condition |
|---|---|---|
| Decode + STFT + cache plumbing | **Keep**, upgrade to 44.1 kHz stereo path + stage keys | free quality (hats), required for caching |
| HT-Demucs FAST | **Keep as default** | works; stems are the big cost (11 of 13.4 s); optional HIGH only after benchmark |
| Stem storage (mono 16-bit) | **Upgrade → stereo** | audit §12.11; ~2× disk |
| Tempo (autocorr + fold) | **Keep as one hypothesis source + fallback**; add Beat This! beats/downbeats if it wins | measured octave failures; benchmark on tempo truth |
| `pick_downbeat` | **Replace** by neural downbeats when better; keep as fallback | [hypothesis] |
| Drum onset detection | **Keep + tune** (separately from classification) | works structurally; make thresholds data-driven |
| Drum classifier | **Replace** behind `DrumClassifier` (small learned model; heuristics as fallback) | needs labelled onsets → from corrections + synthetic mixtures |
| Bass YIN | **Keep as a signal**, add voicing/octave/type/unknown-pitch | |
| Structure | **Replace** with self-similarity + repetition (neutral ids first) | |
| Genre rules | **Replace** by calibrated fusion; keep rules as *features* (soft likelihoods) | `GENRE_MODEL_RESEARCH.md` |
| Key/harmony, groove, breaks, phrases, vocals, chops, loopability | **New (DSP)** | no new dependency |
| Embeddings | **New, optional pack** (Discogs-EffNet) | decision D1 |

## 10. Phases (analysis track; mapped to `LEARN_V2_IMPLEMENTATION_PLAN.md` phases)

| Phase | Content | Acceptance |
|---|---|---|
| **A0 (done)** | Map + diagnosis + plan + benchmark harness + baseline | this phase |
| **A1** | Stage interface + stage-keyed cache + stereo stems + TrackUnderstanding v2 type + v1→v2 converter (no behaviour change) | all current tests pass; old caches/projects load; identical outputs to v1 on the fixture tracks |
| **A2** | Tempo/beat/downbeat V2 (Beat This! bake-off vs current) | beat F / downbeat accuracy / Acc1 / Acc2 improved on the private set, with tempo truth |
| **A3** | Drum V2 (onset/classification split, multi-label, UNKNOWN, corrections dataset) | per-class F1 ≥ baseline + agreed margin on labelled set |
| **A4** | Groove + breaks + phrases | explanations generated; spot-checked by the owner on 10 tracks |
| **A5** | Key/harmony + bass V2 | key MIREX score reported; unknown-pitch instead of invented notes |
| **A6** | Structure V2 + vocals | boundary hit-rate improved |
| **A7** | Chop opportunities + loopability | owner-rated usefulness on 10 tracks |
| **A8** | Fusion + confidence calibration + genre (G-phases) + debug view | calibration error ≤ 0.1; low-confidence → UNKNOWN works |
| **A9** | Analysis modes QUICK/BALANCED/DEEP **only if** benchmarks justify | default stays practical on Apple Silicon |

## 11. Risks

* **No labelled real data** → every "better" claim blocked. Mitigation: owner-supplied private set (≥ 5 tracks/genre, partial truth is fine).
* **Packaging**: frozen-sidecar build is unverified locally; each new heavy dependency raises risk → verify on CI before merging each.
* **Python 3.14**: madmom already fails; always test import in the frozen build, not just `pip`.
* **Regression**: recipe/tutorial/UI rely on `TrackAnalysis` v1 fields (events, grid, sections labels used as identifiers) → converter + contract tests first (A1).
* **Time**: BALANCED ≈ 25–35 s [estimate]; the UI already shows stage progress; Beat This! and embeddings must be optional stages that degrade gracefully.
* **Over-engineering**: do not build all of A1–A9 before the owner supplies data; each phase must be benchmarked and approved.

## 12. Decisions needed from the owner (stop point)

1. Approve this plan and the **keep/upgrade/replace** table.
2. **D1** licence decision for the optional Genre Pack (NC weights).
3. Supply a **private labelled set** (genres required; BPM/key/sections/drums where known).
4. Approve **stereo stem cache** (≈ 2× disk) and Beat This! as a candidate (MIT, +78 MB download).
