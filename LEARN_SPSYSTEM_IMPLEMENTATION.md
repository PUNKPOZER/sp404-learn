# LEARN — real `.spsystem` support (Phase 2A) — implementation report

Status: **implemented and tested; no UI.** The canonical `sp-system-spec/` was not touched (`git diff -- sp-system-spec` is empty; DROP's snapshot hash stays valid).
This file is LEARN-side documentation and is deliberately **not** part of `sp-system-spec/`.

## 1. Where the code is
`python/engine/spsystem/` — `zipio.py` (strict ZIP reader + raw-copy writer), `package.py` (open, validation levels, module loading, semantic warnings),
`schemas.py` (canonical schemas via `jsonschema`), `project.py` (what LEARN may change, save planning, revision rules), `fsio.py` (open, atomic save, lock, recovery,
safe extraction), `adapters.py` (LEARN models ⇄ canonical modules). Sidecar: read-only `spsystem_open` RPC. Tests: `python/tests/test_spsystem.py` (36).
Fixture tool: `python/tools/make_spsystem_fixture.py`. Packaging: `scripts/build-sidecar.sh` bundles `sp-system-spec/schemas` and `jsonschema`; CI smoke-tests it.

**The package layer never goes through the `.sp404learn` model.** LEARN edits only the files it owns (analysis/track.json, learn/*.json, manifest.json shared fields) and copies every other
entry **raw** (identical compressed bytes, CRC, method, timestamp, attributes), so nothing LEARN does not understand can be lost.

## 2. Mapping: LEARN → SP SYSTEM
| LEARN | canonical | notes |
|---|---|---|
| `grid.bpm/origin/confidence/candidates` | `analysis.tempo.raw {bpm, beatOffsetSeconds, confidence, alternatives}` | `bpm` = `corrections.bpm.raw` when the user corrected (the engine's own first reading), never the corrected value |
| `corrections.bpm.user` | `analysis.tempo.userOverride {bpm}` | effective = `userOverride ?? raw` (`adapters.effective`) |
| DROP's `manifest.tempo` | `analysis.tempo.raw.evidence[]` (imported evidence) | not the engine's `raw`; `hints.tempoTrust` = user / high / low / none |
| `grid.beats_per_bar` | `analysis.meter.raw` | |
| `genre` / `genre_user` | `analysis.genre.raw {status, primary, subgenre, candidates, model}` / `userOverride {genre}` | raw never overwritten by re-analysis |
| `events` | `analysis.drums.raw.events[]` | |
| `bass` | `analysis.bass.raw.notes[]` | |
| `sections` | `analysis.structure.raw.sections[]` | |
| `characteristics`, `likely_styles` | `analysis.groove.raw` (marked experimental), `vocals.raw.activity` | |
| (none) | `key`, `phrases` | LEARN has no key detector / phrase analysis — omitted, not invented |
| region lists | `analysis.chopCandidates[]` (`state: suggested`) | **never** written to `project/chops.json` (`E_NOT_OWNER` if attempted) |
| lesson plan (built in the UI) | `learn/recipe.json` | `recipe_from_plan(plan)`; pseudo item `track` is app navigation and is not exported; extras under `x-sp404-learn` |
| project lessons done | `learn/progress.json` | global course progress is a different thing and is not copied |
| lesson needs | `learn/requirements.json` | `requirements_doc()`; no UI yet |
| user BPM in LEARN | `manifest.tempo {origin:"user", setBy:"sp404-learn"}` (+ analysis override) | spec §12 |

DROP → LEARN import (`adapters.import_from_drop`, `resolve_source`): source (embedded → content-addressed extraction; lightweight → size + hash check, states `external-ok|moved|changed`),
tempo, meter, chops, samples, pads, loops. Nothing is recomputed; the analysis engine is unchanged.

## 3. Compatibility with `.sp404learn`
Untouched: `TrackAnalysis`, its `to_dict/from_dict`, the project file and all existing tests pass unchanged (`test_sp404learn_project_format_is_unchanged_and_independent`).
No migration; nothing converts a `.sp404learn` into `.spsystem` (or back). Linking the two (`spSystemId` in `.sp404learn`) is **not** done yet.

## 4. Real DROP fixtures — results
* `drop-created.spsystem` → LEARN reader: **VALID**, id `6f1c2b9e-…`, revision 1.
* `after-learn-and-drop.spsystem` → **VALID_WITH_WARNINGS** (`W_UNKNOWN_FILE x-future/notes.bin`), revision 3.
* LEARN save of `drop-created` (+analysis, recipe, progress, requirements): revision 1 → **2**, `chops/samples/pads/loops/source/3 samples` **byte-identical** (compressed bytes, CRC, method), DROP's `extensions["x-sp404-drop"]` kept.
* **Real DROP code** (`mac/app/spsystem-fs.js`) opened LEARN's file (VALID), listed the analysis candidate, changed pad A4, saved (revision 3→… ), and LEARN read it back: id unchanged, LEARN's four files byte-identical, pad A4 changed, LEARN could save again on top (revision +1). Automated as `test_real_drop_reads_and_saves_a_learn_file_and_learn_reads_it_back` (skipped when the DROP repo / node are absent; `SP404_DROP_REPO` overrides the path).
* Hand-back fixture for DROP: `python/tests/fixtures/spsystem/learn-mutated.spsystem` (revision 4, user BPM correction 120→118 kept beside the raw reading) — DROP's reader: VALID_WITH_WARNINGS, project object created.

## 5. Unknown-data, UUID, revision
* Unknown entry `x-future/notes.bin` after a LEARN save: raw bytes identical (`00010203fafbfcfd`). Unknown fields inside LEARN modules (`x-learn-private`, `x-future-field`) survive: unchanged modules are copied raw; a rewritten analysis is a merge (raw replaced, `userOverride`, decided candidates and unknown keys kept).
* UUID never changes on save/save-as; only "copy" creates a new one (`derivedFrom` in `extensions["x-sp404-learn"]`).
* Revision: new project 0 in memory → first save 1 → +1 per save; a package without `revision` is revision 0 and gets 1 on LEARN's first save. Conflict (changed/deleted/other project/unreadable) → `Conflict`, nothing written.
* Atomic save with failure injection at write / fsync / before-backup / before-rename: original bytes unchanged, no temp or lock left, retry succeeds. Lock `<file>.lock` is format-compatible with DROP's (`{pid, at (ms), host}`).

## 6. Tests
36 new tests in `python/tests/test_spsystem.py`; **Python suite 80 passed** (was 44); Vitest 88 passed (unchanged). Covers: real fixtures, canonical examples vs schemas, round trip, unknown files/fields, raw vs userOverride (BPM and genre), candidates ≠ chops, ownership, revision/UUID/copy, conflicts, crashes at every save step, validation failure, locks and recovery, source resolution, 15+ hostile archives (path traversal ×5, executables ×3, symlink, case collision, duplicate, zip bomb, truncation, CRC damage, not-a-zip, ZIP-type confusion, newer module/format, invalid module, proto keys, stale analysis/dangling references).

## 7. Unresolved schema issues (none blocking) and LEARN-vs-DROP interpretation differences
1. **S11 `beatOffsetSeconds`** — LEARN's `grid.origin` is the start of bar 1 (a downbeat); DROP writes its grid offset (beat 1 of its grid). LEARN records `beatOffsetMeaning: "downbeat"` in `analysis.tempo.raw` and does **not** overwrite DROP's `manifest.tempo.beatOffsetSeconds` (only `set_user_tempo(…, beat_offset=)` does). Up to 3 beats of ambiguity remain until the schema says which it is.
2. **Spec §15 asks for a three-way merge on conflict; both apps refuse** (detect and stop). Consistent between apps, but a deviation from the prose.
3. **Newer module of the *other* app**: LEARN treats a newer *LEARN-owned* module as `UNSUPPORTED_VERSION` (it could not edit it safely) and a newer *DROP-owned* one as `W_MODULE_NEWER`; DROP does the mirror image. Symmetric, but not written in the spec.
4. `manifest.tempo` vs `analysis.tempo.userOverride` duplicate the user's BPM by design (§12); both writers must keep them in step — no schema constraint ties them.
5. `analysis.tempo.raw.evidence` and `beatOffsetMeaning` are LEARN additions inside open objects (allowed); a declared field would make them portable.
6. `requirements → sample category` mapping (S15) still prose-only; `progress.lessonsDone` uses epoch ms while everything else is seconds/ISO (S17).
7. Known and unchanged from DROP's list: S10 (32- vs 64-hex hashes — LEARN writes `audioSha256` as its 32-char cache key; comparisons use the shorter prefix), S12 (`revision` optional), S22 (relative `$id`; LEARN resolves via a local registry).
8. LEARN does not write DROP's `x-sp404-drop.ids` counters or `renderedFrom`; it never touches DROP-owned files, so it cannot invalidate them.
9. Python's `jsonschema` is now a dependency (MIT; `referencing`, `rpds-py`, `attrs`, `jsonschema-specifications` — all MIT). `format: date-time` is checked.

## 8. Not done (by instruction or by necessity)
No OPEN IN LEARN / PREPARE IN DROP buttons, no Library, no URL schemes, no pad editor, no analysis UI. No RPC writes a package yet (only `spsystem_open`, read-only); the lesson plan is built in the front-end, so `recipe_from_plan` needs the UI to hand it the plan. The full frozen sidecar was **not** built locally (a mini PyInstaller build with the same flags reads packages fine; CI will run the full build and the new smoke check).
