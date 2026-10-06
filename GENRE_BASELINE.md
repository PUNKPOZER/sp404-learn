# GENRE_BASELINE — what the current classifier actually does (2026-10-06)

Measured with the new benchmark harness (`python/bench/`) against the **current production pipeline, unchanged** (`engine.pipeline.Analyzer`, no cache).
This file records a baseline; it does **not** claim any improvement. Track titles and paths stay in the private, git-ignored manifest (`python/bench/local/`); here tracks are F01–F10 (manifest order).

## What was tested

* **Material available locally:** ten footwork/juke tracks from the owner's `~/Downloads/Footwork` (DJ Manny / DJ Rashad family and one more). Expected genre = `footwork` or `juke` (either accepted). **This label is inferred from folder name and artists — it is not verified ground truth**, and there is **no BPM, beat, key or section ground truth** for any file.
* **Not available:** any other genre. Therefore **no false-positive rate, no confusion between genres, no per-genre comparison** can be measured. A classifier that answers "Footwork" whenever BPM ≈ 160 would also score 70 % here. The numbers below are a *sanity floor*, not an accuracy estimate.
* Two runs: `current-mix` (stems not used; the app's behaviour without the Demucs model) and `current-stems` (HT-Demucs on MPS, the app's default when the model is installed).

## Results

| | current-mix | current-stems |
|---|---|---|
| Top-1 (footwork/juke accepted) | **70 %** (7/10) | **70 %** (7/10) |
| Top-3 | 90 % | 100 % |
| Family-level | 70 % | 70 % |
| Mean time / track (3–4 min audio) | **2.0 s** (max 2.4) | **13.4 s** (max 15.2), Apple Silicon, MPS |

Per-track view (identical top-1 in both runs; stems changed only a few third-place ranks):

| # | BPM reported (alternatives) | Top-3 candidates (heuristic score) | Top-1 |
|---|---|---|---|
| F01 | 160 (80, 160.25) | Footwork 0.85 · Jungle/DnB 0.83 · Breakbeat 0.40 | ✔ |
| F02 | 160 | Footwork 0.84 · Jungle/DnB 0.83 · Breakbeat 0.39 | ✔ |
| F03 | **80** (106.5, 160, 160.25) | **Hip-hop 0.56** · Breakbeat 0.40 · Footwork 0.35 | ✘ |
| F04 | 160 | Footwork 0.85 · Breakbeat 0.40 · Jungle/DnB 0.31 | ✔ |
| F05 | 160 | **Jungle/DnB 0.88** · Footwork 0.85 · Breakbeat 0.40 | ✘ |
| F06 | 160 | Footwork 0.85 · Jungle/DnB 0.82 · Breakbeat 0.40 | ✔ |
| F07 | 160 | Footwork 0.84 · Jungle/DnB 0.82 · Breakbeat 0.40 | ✔ |
| F08 | **106.7** (71.25, 80, 213.3) | **Breakbeat 0.40** · Footwork 0.35 · Jungle/DnB 0.33 | ✘ |
| F09 | 160 | Footwork 0.79 · Breakbeat 0.33 · Jungle/DnB 0.31 | ✔ |
| F10 | 147.7 (73.5, 73.9, 98) | Footwork 0.85 · Techno 0.60 · Breakbeat 0.40 | ✔ |

## What the baseline shows

1. **The genre answer is a function of the tempo answer.** All three misses are tempo misses: F03 reads at 80 BPM (the half-time reading) and becomes "Hip-hop"; F08 reads at 106.7 BPM (= 160 × 2/3, a plausible polyrhythmic reading) and becomes "Breakbeat"; F05's tempo is right (160) but Jungle/DnB's rule (160–182 BPM + hats) outscores Footwork by 0.03. (That 160 is the *correct* tempo for these tracks is my assumption from the genre; no BPM truth exists locally.)
2. **Footwork and Jungle/DnB are separated by almost nothing** in the current rules: they differ by ≤ 0.03 in 5 of the 10 tracks (F01, F02, F05, F06, F07: e.g. 0.85 vs 0.82–0.83). The scores are rule sums, not probabilities.
3. **Stems do not change the genre outcome** (same BPM, same top-1). The error source is tempo ambiguity + coarse rules, not drum-detection noise. This argues against "better drums first" as the fix for genre.
4. **Confidence is not calibrated.** F05 is wrong with score 0.88 (the highest of the run); F08 is wrong with 0.40. The UI currently shows these as percentages-like numbers — false precision.
5. **Label leak:** the Russian label "Хип-хоп" reaches the harness (the UI translation layer maps known labels; unknown ones leak). Genre Engine 2.0 must emit ids, not display strings.
6. **Vocabulary gap:** the current classifier can never answer UK Garage, 2-Step, Drum & Bass (separate from Jungle), Ambient, Juke (separate from Footwork), Boom Bap. Six hardcoded outputs.
7. **Time budget:** stems cost ~6.5× the rest of the pipeline (13.4 s vs 2.0 s). A new embedding stage (≈ 1–3 s, **estimate**) fits inside the existing budget; changing only fusion weights must not re-run Demucs (TRACK_ANALYSIS_V2_PLAN §Cache).

## How to reproduce

```bash
cd python
cp bench/manifest.example.json bench/local/benchmark.json      # edit paths; audio is never committed
../.venv/bin/python -m bench.run bench/local/benchmark.json --system current-mix   --out bench/results/baseline-current-mix
../.venv/bin/python -m bench.run bench/local/benchmark.json --system current-stems --out bench/results/baseline-current-stems
```

`bench/local/` and `bench/results/` are git-ignored. Unit tests for the metrics: `python/tests/test_bench.py`.

## What is still needed to make a real baseline

≥ 5 (better 10) tracks per genre for: Footwork/Juke, Jungle, Drum & Bass, UK Garage / 2-Step, Breakbeat, House, Techno, Hip-Hop, Ambient — supplied by the owner as local files — with, wherever the owner is sure, a BPM range (the manifest accepts partial truth). Until then, Genre Engine 2.0 cannot be declared better.
