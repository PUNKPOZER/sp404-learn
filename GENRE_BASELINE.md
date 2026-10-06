# GENRE_BASELINE — measured results on the owner's 58-track set (2026-10-06/07)

Everything here was measured with the benchmark harness (`python/bench/`) on **58 tracks supplied by the owner** (`~/Downloads/TRACKS`, playlist `TRACKS.m3u8`, DJ-software export `TRACKS.txt`). Audio, titles and paths stay in the private, git-ignored manifest (`python/bench/local/`); the repository contains only code, tests and these aggregate numbers.

## What the "truth" is — and is not

* **Genre truth = the folder the owner filed each track in** (Footwork 9 · DNB 9 · Hip-Hop 12 · Ambient 6 · UK Garage/2-Step 5 · Breakbeat 5 · Techno 5 · House 4 · Jungle 3). It is the owner's own sorting, **not independently verified**, and some files are debatable (e.g. the Ambient folder holds Autechre / Boards of Canada / Aphex Twin / Orbital — I accepted `ambient` **or** `idm`; Breakbeat holds Born Slippy / SL2 / FSOL; Techno holds a Chemical Brothers track; Hip-Hop holds a "Juke" track). Where genres overlap, several labels are accepted (`DNB` ⇒ drum_and_bass **or** jungle, Footwork ⇒ footwork **or** juke, UKG ⇒ uk_garage **or** two_step, …).
* **BPM / key columns from the DJ software are "reference readings", not truth** (they also contain half/double/odd readings, e.g. several footwork tracks listed at 80, 90, 120). They are reported as *agreement*, never as accuracy.
* 58 tracks and 9 classes is a small set: one track = 1.7 points; differences of 1–3 tracks are **not significant**. Parameters were chosen on this same set, so the fusion numbers below are partly in-sample; the honest estimate is the leave-one-out figure.

## Results

| System | Top-1 | Top-3 | Family | Mean time / track |
|---|---|---|---|---|
| **current heuristic, mix only** (rules on BPM/syncopation/hats) | **36 %** | 69 % | 52 % | 2.7 s |
| **current heuristic, with HT-Demucs stems** (app default when installed) | **41 %** | 71 % | 55 % | 18.9 s (Apple Silicon, MPS) |
| **Genre Pack model only** (Discogs-EffNet → our labels) | **69 %** | **95 %** | 78 % | **1.0 s** |
| **Genre Engine 2.0 fusion** (model + rhythm evidence, default config) | **78 %** | **93 %** | **81 %** | 3.1 s (mix-only analysis + model) |
| fusion, **leave-one-out CV** (parameters chosen without the held-out track) | 74 % | 93 % | — | — |

Calibration of the fusion's top-1 confidence: expected calibration error **0.07** (in-sample; **0.12** leave-one-out). Statuses: 36 tracks `confident` (**94 %** correct), 22 `hybrid` (the rest). The old "score" had no such property (a wrong answer at 0.88 was the highest score of the first run).

Per genre (Top-1, `genre-fusion` vs current heuristic with stems):

| Genre | n | current + stems | **Genre Engine 2.0** |
|---|---|---|---|
| Footwork | 9 | 67 % | **100 %** |
| Drum & Bass | 9 | 44 % | **100 %** |
| Jungle | 3 | 0 % | **100 %** |
| Hip-Hop | 12 | 58 % | **83 %** |
| Techno | 5 | 40 % | **80 %** |
| House | 4 | 50 % | **75 %** |
| Ambient (+IDM accepted) | 6 | 0 % | **67 %** |
| UK Garage / 2-Step | 5 | 0 % | **40 %** |
| Breakbeat | 5 | 60 % | **20 %** (the only genre that got worse; the model hears several of these files as techno / UK Garage / house — plausible for crossover tracks, but still a miss against the folder label) |

### Tempo (current engine, unchanged): agreement with the DJ-software BPM

**81 % within ±3 %**, **97 % when half/double/×1.5 readings count** (n = 58; relations seen: half, ×1.5). So the tempo engine is mostly consistent with Rekordbox on this set; the earlier 10-footwork run showed the failure mode (80 / 106.7 BPM instead of ≈160) is a minority case, not the norm. Beat/downbeat/key/drum/section truth does not exist locally; those metrics remain implemented but **unrun**.

## What the numbers say

1. **The current rule-based "style hint" is not a genre classifier** (36–41 %, 0 % on Jungle / UKG / Ambient; its vocabulary has six outputs). Stems add +5 points for 7× the time — they were never the bottleneck for genre.
2. **A real music embedding model is the missing signal**: 69 % / 95 % Top-1 / Top-3 from the model alone in about **1 s** per track.
3. **Fusion helps, modestly**: +9 points Top-1 over the model alone in-sample (+5 leave-one-out); its main practical benefit is **calibrated status** (confident / hybrid / unclear) instead of false precision — confident answers are right 94 % of the time.
4. **Weak spots** (data to improve on, not a verdict): UK Garage / 2-Step (2/5; at least one modern bassline-style file is heard as Dubstep/Halftime/Grime), Breakbeat (1/5), and Ambient/IDM (taxonomy overlap). 2-Step and Footwork have **no Discogs label**; Footwork works here because "Juke"/"Ghetto" fire strongly on these tracks.
5. **All the acceptance gates set in `LEARN_V2_IMPLEMENTATION_PLAN.md` Phase 2 are met on this set** — Top-1 ≥ baseline + 15 points (+37), Top-3 ≥ 90 %, calibration error ≤ 0.1 (in-sample), footwork recall not worse (100 % vs 67 %) — **with the caveats above** (small set, folder labels, in-sample tuning, breakbeat regression). A larger, independently-labelled set should confirm before this is called final.

## How to reproduce

```bash
cd python
../.venv/bin/python -m bench.import_playlist ~/Downloads/TRACKS.m3u8 --txt ~/Downloads/TRACKS.txt --out bench/local/tracks.json \
   --map 'Footwork=footwork,juke' --map 'DNB=drum_and_bass,jungle' --map 'JUNGLE=jungle,drum_and_bass' \
   --map 'UK Garage:2-Step=uk_garage,two_step' --map 'HOUSE=house,deep_house' --map 'hip hop=hip_hop,boom_bap,instrumental_hip_hop' \
   --map 'Ambient=ambient,idm' --map 'Breakbeat=breakbeat' --map 'Techno=techno,acid_techno'
for s in current-mix current-stems genre-model genre-fusion; do ../.venv/bin/python -m bench.run bench/local/tracks.json --system $s --out bench/results/full-$s; done
../.venv/bin/python -m bench.fit_fusion bench/local/tracks.json bench/results/full-genre-model bench/results/full-current-mix   # leave-one-out + calibration
```

The earlier 10-track footwork-only run (70 % Top-1 for the current heuristic, all misses tempo-driven) is superseded by this table; its qualitative finding stands: the heuristic's genre answer follows its tempo answer.
