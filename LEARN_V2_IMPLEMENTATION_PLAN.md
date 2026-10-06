# LEARN_V2_IMPLEMENTATION_PLAN — Genre Engine 2.0 + Learning Library 2.0 + Track → Lesson

Status: **plan for approval. No production code was changed.** Phase 1 (benchmark infrastructure + baseline) is already done as *new, dev-only files*; everything else waits for approval.
Read together with: `TRACK_ANALYSIS_V2_PLAN.md` (analysis engine), `GENRE_MODEL_RESEARCH.md`, `MODEL_RESEARCH.md`, `GENRE_BASELINE.md`, `PROJECT_AUDIT.md`, `DESIGN_SYSTEM.md`.

Coordination note: the SP SYSTEM redesign, the RU/EN switch and 13 genre courses already live on branch `design/sp-system` (head `71694de` at the time of writing). Everything below builds **on top of** that branch; nothing replaces the new shell, tokens, `DeviceDiagram`, `PadGrid`, `GenreArt`, i18n (`t()` / `L()`), or the verified-content rule.

---

## 1. What exists today (inspection result)

### 1.1 Genre / style hint
* `python/engine/transcription/characteristics.py`: `measure()` (density, syncopation, four-on-floor, timing variation…) and **`likely_styles()` = 6 hardcoded rules on BPM/syncopation/hat density** → top 3 `{style, score, why}`; stored in `TrackAnalysis.likely_styles`, cached with the analysis, rendered in `src/screens/Track.tsx` ("Likely style — a hint, not a verdict"). Russian strings are stored in the cached result; the UI maps them through `src/lib/engineText.ts`.
* No genre in recipes/lessons today; the 13 courses are chosen by hand from Home/Courses.
* Baseline: **70 % top-1 on 10 footwork tracks, with all misses tempo-driven or near-ties** (`GENRE_BASELINE.md`).

### 1.2 Learning / courses
| Piece | File | Role |
|---|---|---|
| Course specs (13 genres, bilingual via `L()`) | `python/translator/sp404/courses.py` (`_build()` → `COURSES` view) | patterns A–D + lessons (`info`/`voice`/`pattern` kinds) |
| Course → lesson steps | `python/translator/sp404/learn.py` (`build_course`, `list_courses`) | emits `TutorialStep`-shaped dicts (`controls`, `highlight`, `grid`, `pad`, `lesson*`) |
| Track tutorial | `python/translator/sp404/tutorial.py` (+`text.py` verified button names) | steps from the recipe |
| Sidecar | `python/sidecar/server.py` `m_courses`, `m_course`, `m_recipe` | RPC; `lang` is injected per request |
| Lesson renderer | `src/screens/Tutorial.tsx` | one renderer for modes `track | course | fx | trick` (`DeviceDiagram`, `StepSequencer`, step list, progress bar) |
| FX / Tricks / Reference content | `src/content/{types,sources,fx,tricks,reference,toSteps}.ts` | typed, `status: verified | todo`, Roland `sources` + `verifiedOn`, tests in `content.test.ts`; `stepsFromContent()` adapts them to `TutorialStep` |
| Screens | `HomeLearn`, `Courses`, `FxLab`, `FxDetail`, `Tricks`, `TrickDetail`, `Reference`, `TrackLabHome` | |
| Progress | `src/lib/progress.ts` (localStorage `sp404learn.progress`: furthest step per course) | "Continue" card, Recent list |
| Device diagram | `src/components/DeviceDiagram.tsx` (`highlightPads`, `highlightControls`), `Knob`, canonical `PadGrid` | **already supports the "SP device highlight" requirement** |
| i18n | `src/lib/i18n.ts` `t(ru,en)`; `python/translator/sp404/i18n.py` `L(ru,en)` | RU/EN inline; language reload |

### 1.3 Reusable as-is
`TutorialStep` + `Tutorial.tsx` (extend, don't fork) · `DeviceDiagram`/`PadGrid`/`StepSequencer` · verified-content pipeline & tests · `SourceList` · progress store · tour mechanism · i18n helpers · `GenreArt` (13 genres incl. the four newest) · sidecar RPC + `lang` injection · `bench/` harness.

### 1.4 What is *not* reusable / needs a new design
Hardcoded Python course specs (hundreds of lessons would bloat `courses.py`; content should be **data**) · `status: verified|todo` is too coarse (no `verifiedAgainst`, firmware, hardware-vs-general split) · no difficulty/duration/prerequisites/related/search · progress is per-course only (no per-lesson completion across content types) · no practice mode · no link between analysis and recommendations.

---

## 2. Proposed content schema (data, not code)

Content lives in **versioned data files** validated at build/test time, bilingual by construction, rendered by the existing lesson renderer.

```
content/                       (repo root, JSON; loaded by the app via Vite import and by Python via json)
  library.index.json           generated: ids, types, titles, tags (for search & recommendations)
  courses/<id>.course.json     e.g. sp404-from-zero, intermediate, footwork, jungle, …
  lessons/<id>.lesson.json
  tricks/<category>/<id>.trick.json
  fx/<id>.fx.json
  reference/<id>.ref.json
  recipes/<id>.recipe.json
  exercises/<id>.exercise.json
```

```ts
// all user-visible strings are { ru: string; en: string }  (Loc)
type Loc = { ru: string; en: string };
type Difficulty = "beginner" | "intermediate" | "advanced";
type VerificationStatus = "verified" | "needs_review";          // replaces Status "verified"|"todo" (migration map: todo → needs_review)

interface Verification {
  status: VerificationStatus;
  /** what the hardware operations were checked against */
  verifiedAgainst?: { title: string; url: string; section?: string }[];   // Roland static.roland.com / articles.roland.com only
  firmwareVersion?: string;         // e.g. "v4.00" if the manual page is version-specific
  verifiedOn?: string;              // ISO date
}

interface ContentBase {
  id: string; type: "course"|"lesson"|"trick"|"reference"|"exercise"|"recipe"|"fx";
  title: Loc; summary: Loc; description?: Loc;
  category: string; tags: string[];  // tags drive search + genre recommendations ("genre:uk_garage", "skill:chopping", "fx:djfx")
  difficulty: Difficulty; durationMin: number;
  prerequisites?: string[]; related?: string[];
  verification: Verification;       // the item's hardware claims; general advice carries no hardware claim
}

interface Lesson extends ContentBase {
  type: "lesson"; objectives: Loc[]; steps: LessonStep[]; tips?: Loc[]; exercise?: string /*exercise id*/;
}

type LessonStep = {
  /** what / why / how / try — every lesson must answer all four (lint-enforced) */
  text: Loc;                          // short: readable while standing at the SP
  kind: "hardware" | "concept";       // hardware steps require verification; concept steps are general music-production advice
  deviceHighlight?: { controls?: string[]; pads?: number[] };       // names as printed on the unit (reuse existing DeviceDiagram)
  padGrid?: { kit?: Record<number,string>; labels?: Record<number,string> };
  stepPattern?: { bpm?: number; resolution?: 16; voices: Record<string, number[]> };   // existing StepMap semantics
  audioExample?: { id: string; note?: Loc };                         // reference to a synthesized or user-supplied example (never copyrighted audio)
  parameterExample?: { control: string; setting: string; effect: Loc };
  why?: Loc; tryIt?: Loc;
};

interface Course extends ContentBase { type: "course"; lessons: string[]; finalProject?: Loc; genre?: string /*taxonomy id*/; bpm?: number }
interface Trick extends ContentBase { type: "trick"; steps: LessonStep[]; notes?: Loc[]; categoryGroup: "chopping"|"rhythm"|"resampling"|"bass"|"fx"|"workflow"|"performance"|"external" }
interface FxEntry extends ContentBase { type: "fx"; button?: string; whatItDoes: Loc; controls: {id:string; label:string; range?:string; meaning: Loc}[];
  goodFor: Loc[]; lesson?: string; exercise?: string; tips: Loc[]; relatedEffects: string[]; tryThis: LessonStep[] }
interface Reference extends ContentBase { type: "reference"; term: Loc; answer: Loc; see?: {type: string; id: string} }
interface Exercise extends ContentBase { type: "exercise"; practice: PracticeSpec }   // §Phase 7
interface Recipe extends ContentBase { type: "recipe"; ingredients: Loc[]; steps: LessonStep[] }
```

Rules enforced by tests/lint (`scripts/validate-content.ts`, vitest):
1. Every string has `ru` **and** `en`.
2. `verification.status === "verified"` requires `verifiedAgainst` with Roland URLs and `verifiedOn`; any `kind: "hardware"` step inside an item whose status is `needs_review` is **never rendered as production content** (renders nothing, or a dev-only "needs review" badge in debug).
3. Button/control names must exist in the `DeviceDiagram` control vocabulary (printed names) — no invented combos.
4. A lesson has objectives, ≥ 1 `concept` or `hardware` step, a `tryIt`, difficulty, duration. Steps are short (≤ 220 characters).
5. IDs unique; `prerequisites`/`related` resolve; courses reference existing lessons.
6. Conversion tests: `Lesson → TutorialStep[]` (so the **existing renderer** shows it).

Migration: current `fx.ts`/`tricks.ts`/`reference.ts` entries are converted mechanically to JSON with `status: verified → verification.status: verified` and their `sources`/`verifiedOn` → `verifiedAgainst`/`verifiedOn`; `courses.py` genre specs are converted last (Phase 6), generating JSON that `learn.py` reads, so patterns/lessons stay byte-identical until intentionally edited (snapshot test).

---

## 3. Files that would change (summary)

| Area | Files (existing) | Nature |
|---|---|---|
| Genre | `python/engine/transcription/characteristics.py`, `python/engine/pipeline.py`, `python/engine/model.py` (`TrackAnalysis` gets optional `genre` block), `src/screens/Track.tsx`, `src/lib/engineText.ts`, `src/lib/types.ts` | replace rules by a prediction object; add change-genre UI |
| Cache | `python/engine/cache.py`, `python/engine/pipeline.py` | stage-keyed cache (A1) |
| Learning data | `src/content/*.ts` → data loaders, `python/translator/sp404/{courses,learn}.py`, `src/lib/types.ts`, `src/screens/{Tutorial,HomeLearn,Courses,FxLab,FxDetail,Tricks,TrickDetail,Reference}.tsx`, `src/lib/progress.ts`, `src/state/{store,actions}.ts`, `src/lib/tours.ts` | schema, loaders, filters (difficulty/category), progress per lesson |
| Track → Lesson | `python/translator/sp404/{recipe,tutorial}.py`, `python/sidecar/server.py`, `src/screens/{Recipe,Track}.tsx` | `LessonPlan` generation, "Learn this track" view |
| Search | new `src/lib/search.ts`; `Reference.tsx` search box generalised | |
| Practice | new components; `Tutorial.tsx` hook | |
| Docs/tests | `README`, `ARCHITECTURE`, `DESIGN_SYSTEM`, `THIRD_PARTY_LICENSES.md`, `python/tests/*`, `src/**/*.test.ts` | |

New files are listed per phase.

---

## 4. Regression risks (global)

| Risk | Where | Mitigation |
|---|---|---|
| `TrackAnalysis` v1 shape consumed everywhere (Track/Drums/Bass/Recipe/Structure/Chop) and saved in `.sp404learn` v1 | cache/projects | additive optional fields only; v1 → v2 converter; **contract tests that load an old project and the fixture analyses**; never bump `.sp404learn` `version` without a migration |
| Russian text stored in cached analyses | cache | new fields store **ids/enums** (`genre: "uk_garage"`, section `identity: "A"`), UI maps to labels via `t()`; old cached strings still go through `engineText` |
| Section labels used as identifiers (`ИНТРО`…) | `lib/sections.ts` | keep until Structure V2; add `identity`/`role` fields and migrate colours to them |
| Tests assert specifics (footwork = 18 lessons; courses ≥ 13; `courses` consistency) | `test_translator.py` | snapshot tests when converting courses to data; run before/after |
| Tour selectors (`data-tour`) break when screens change | `lib/tours.ts`, `Tour.tsx` | keep attributes; update tour copy (RU+EN) per phase |
| Progress key `sp404learn.progress` (course-level) | `lib/progress.ts` | new per-lesson store under a new key; migrate by reading the old one; never delete user progress |
| Bundle/packaging (PyInstaller) | frozen sidecar | add dependencies one at a time and verify the freeze on CI before merging (A-phases) |
| SP-404 claims | content | the `verification` gate; ship only `verified` hardware steps; keep `needs_review` out of the production UI |
| Performance | analysis | stage cache; embedding/beat stages optional; progress reporting unchanged |
| Two parallel efforts (design vs content) touching `styles.css`/screens | git | work on a feature branch from `design/sp-system`; content screens reuse existing classes (`gc-*`, `fx-*`, `lesson*`); new CSS only in new blocks |

---

## 5. Phases

Phases follow the requested order. "A#" are the analysis phases of `TRACK_ANALYSIS_V2_PLAN.md`; dependencies are stated per phase.

### PHASE 1 — Genre benchmark infrastructure + baseline  ✅ (delivered with this plan, dev-only)
* **New files:** `python/bench/{__init__,taxonomy,manifest,metrics,systems,run}.py`, `python/bench/manifest.example.json`, `python/tests/test_bench.py`, `GENRE_BASELINE.md`, plus the planning/research docs. `.gitignore`: `/python/bench/local/`, `/python/bench/results/`.
* **Files changed:** none in production; `.gitignore` only.
* **Tests:** `test_bench.py` (6 tests: taxonomy/aliases, manifest both spellings + validation, genre metrics, BPM octave tolerance, beat/key/drum/boundary metrics, score+summary). Full Python suite: 30 passed.
* **Risks:** none for the app. Baseline weak (one class).
* **Dependencies:** none.
* **Acceptance:** harness runs the current pipeline on a manifest, reports Top-1/Top-3/family/per-genre/confusion/low-confidence + tempo/beat/key/drum/section metrics where truth exists; baseline recorded; **no claim of improvement**. ✔ met. *Open:* owner-supplied multi-genre set.

### PHASE 2 — Model research and Genre Engine 2.0 prototype  ✅ prototype delivered 2026-10-07 (owner approved the Genre Pack and the phase order)
**Status / measured results:** see `GENRE_BASELINE.md`. Delivered: `python/engine/genre/{effnet_onnx,pack,embed,aggregate,evidence,fusion,predict,corrections}.py`, `mapping.json`, `fusion.default.json`, sidecar RPCs `genre_pack_status|genre_pack_download|genre_predict|genre_correct`, Settings → Genre Pack, `GenreCard` (candidates, hybrid/unclear status, "change genre", evidence), optional `TrackAnalysis.genre`/`genre_user` (additive; old projects load), bench systems `genre-model` / `genre-fusion`, `bench.fit_fusion` (leave-one-out + calibration), tests `test_genre.py` (11). Acceptance gates met on the owner's 58-track set (Top-1 84 % vs 41 %, Top-3 93 %, ECE 0.095, footwork 100 %; Round 2: Breakbeat 1/5 → 3/5, UK Garage unchanged 2/5), with the caveats recorded there (folder labels, small set, in-sample tuning). Deviations from the plan: the model's own 400-style activations are used (no separate head download — the ONNX backbone already outputs them); the pipeline is **not** modified — the prediction is computed on demand from the cached analysis + a cached embedding (no Demucs re-run, no cache-version bump); the NumPy mel front-end was ported from the owner's `noesis` (MIT).
* **Prerequisites:** owner decisions D1 (licence), private labelled set; A1 stage/cache plumbing recommended first.
* **New files:** `python/engine/genre/{__init__,taxonomy,embed,mel,head,aggregate,evidence,fusion,calibrate,config}.py`, `python/engine/genre/mapping.json` (Discogs → ours), `python/engine/genre/fusion.default.json` (weights), `python/bench/systems.py` registrations (`genre-embed`, `genre-fusion`), `python/tests/test_genre_*.py`, `scripts/fetch-genre-pack.*` (explicit user-initiated download + checksum), `THIRD_PARTY_LICENSES.md` entry.
* **Files changed:** `python/engine/pipeline.py` (optional `genre` stage; **behind a flag until accepted**), `python/engine/model.py` (`genre` optional), `python/sidecar/server.py` (`genre_pack_status`, `genre_pack_download`, `set_genre`), `python/engine/cache.py`.
* **Tests:** mapping aggregation; fusion properties (strong model beats single heuristic; no-model degrade caps confidence; weights from config; calibration monotone); embedding **reference vectors** vs Essentia output; benchmark regression gates in CI on a tiny synthetic fixture (no real audio).
* **Risks:** NC licence; Footwork/2-Step have no Discogs label; frozen-sidecar `onnxruntime`; false precision.
* **Dependencies:** `onnxruntime` (optional pack); no AGPL linking.
* **Acceptance:** on the owner's private set, **fusion Top-1 ≥ baseline + 15 pts, Top-3 ≥ 90 %, calibration error ≤ 0.1, footwork recall not worse**; `UNKNOWN/HYBRID` emitted when top-1 < 0.45 or margin < 0.10; app fully works without the pack. Otherwise do not ship; report.

### PHASE 3 — Learning content data model  ✅ delivered 2026-10-07
**Status:** schema (`src/content/schema.ts`), loader + adapters (`load.ts`), validator (`validate.ts`, 6 rule groups, each with a failing test), Lesson/Trick/FX → `TutorialStep` (`stepsFromLessonSteps`, new optional step fields `kind/why/tryIt/parameter`, rendered by `Tutorial.tsx`), per-lesson progress (`lessonsDone` key), Python reader `content.py`. **All 4 FX, 5 tricks and 24 reference entries were migrated mechanically to JSON** and proven identical to the old TS data in RU and EN (a parity test, then removed with the one-off migrator); the old `sources.ts` is gone (sources now live in each item's `verification.verifiedAgainst`). `status: todo` → `verification.status: needs_review` (planned topics stay as plain lists in `content/planned.json`, never as items). Tests: `v2.test.ts` (15) + `content.test.ts` (7) + `test_content.py` (2); `npm run content:check`. Known gap: the content folder must be added to the PyInstaller/Tauri resources before Python reads it in a packaged app (not needed until Phase 6).
* **New files:** `content/` tree (schema examples), `src/content/schema.ts` (types above), `src/content/load.ts`, `scripts/validate-content.ts`, `src/content/v2.test.ts`, `python/translator/sp404/content.py` (read the same JSON), `docs` section in `DESIGN_SYSTEM.md`.
* **Files changed:** `src/content/types.ts` (re-export/migrate), `src/content/toSteps.ts` (Lesson → `TutorialStep`), `src/lib/types.ts` (`TutorialStep` additions: `difficulty?`, `kind?`, `parameterExample?`, `audioExample?`), `src/screens/Tutorial.tsx` (render new optional fields), `src/lib/progress.ts` (per-lesson store, migration).
* **Tests:** schema validation (both languages, hardware-claim gate, vocabulary of controls, step length, ids/relations), snapshot of converted legacy FX/Tricks/Reference (no content change), Lesson→TutorialStep conversion, progress migration.
* **Risks:** mechanical conversion drift; renderer regressions. **Mitigation:** snapshot tests before/after; feature stays invisible until Phase 4.
* **Dependencies:** none (can run in parallel with Phase 2).
* **Acceptance:** all existing FX/Tricks/Reference render identically from data; `needs_review` content never appears in production builds; validator fails CI on any rule breach.

### PHASE 4 — Beginner curriculum + Tricks architecture  ✅ delivered 2026-10-07
**Status:** 38 lessons in 2 paths (**SP-404 from zero — 22**, **Intermediate — 16**), **44 new tricks** (8 groups: chopping 6, rhythm 7, resampling 4 new + 2 existing, bass 3, FX 8, workflow 6, performance 5 new + 2 existing, external 4) on top of the 5 legacy ones = 49; every hardware step was checked page by page against ~65 pages of the Roland SP-404MK2 Reference Manual (v4/v5) and cites them; 3 concept-only tricks need no hardware source. UI: Courses → *Learning paths | Genres* tabs, path cards with real per-lesson progress, lessons in the shared renderer (device diagram lights the controls, why / try-it blocks, hardware vs. music-advice marker), Home “Learning path” card, Tricks filters (8 categories, 3 difficulties, search, duration chips), tour updated. Device diagram extended (+13 controls, banks, VOLUME). Tests: content validator over all items (47 TS tests). **Not done:** audio examples and the "Practice" exercises (Phase 7); lesson-level search (Phase 9); owner review of RU/EN wording; DJ-MODE and SD-card project topics not covered.
* **Content (original; verified against Roland docs where hardware):** **SP-404 FROM ZERO** — 22 lessons (device overview → … → perform the track) + final project "build a complete 1–2 minute track"; **Intermediate path** (advanced chopping, resampling workflows, pattern variations, microtiming, velocity, swing, layering, bass creation, vocal chops, break chopping, transitions, performance FX, pattern chaining, arrangement, sound design, creative resampling); **Tricks** in the 8 categories (chopping, rhythm, resampling, bass, FX, workflow, performance, external workflows).
* **Method:** each hardware step is checked against the official manual page and recorded in `verification`; anything uncertain stays `needs_review` and does not ship. General music advice is marked `concept`. Volume target: **depth over count** — e.g. ~22 + ~16 lessons and ~35 tricks in the first release, each with what/why/how/try-it.
* **New files:** `content/courses/{sp404-from-zero,intermediate}.course.json`, `content/lessons/*.lesson.json`, `content/tricks/**`, `src/screens/{Library,LessonDetail}.tsx` (Home → "Learn"), `src/components/{DifficultyBadge,DurationChip}.tsx`, tour update.
* **Files changed:** `Courses.tsx` (tabs: Paths · Genres), `HomeLearn.tsx` (continue + recommended path), `Tricks.tsx`/`TrickDetail.tsx` (category filters, difficulty, duration), `Sidebar.tsx` (no new top-level area; Library lives under Courses/Tricks), `lib/tours.ts`, `DESIGN_SYSTEM.md`.
* **Tests:** content validation; each course's prerequisites form a DAG; every hardware control exists in the diagram; renderer snapshot; progress per lesson.
* **Risks:** manual verification effort (largest cost); copy quality; scope creep. **Mitigation:** release in batches; `needs_review` content invisible; owner review of RU/EN text.
* **Dependencies:** Phase 3. Roland manual access (web) for verification.
* **Acceptance:** FROM ZERO is completable end-to-end in the app; every step answers what/why/how/try; 0 unverified hardware steps in production; RU and EN complete.

### PHASE 5 — FX Lab  ✅ delivered 2026-10-07
**Status:** all **46 effects of the manual's MFX list** are in (`content/fx/*.fx.json`; 4 from the first release + 42 new), each with name, category (10), difficulty, duration, description, parameter table (names, ranges, meaning — checked page by page against the Roland MFX List), goodFor ×3, tips, practice, related effects (validated), linked tricks (30 effects), and verified TRY-THIS steps (bus effects: choose via [MFX] + [VALUE]/[CTRL 3]; INPUT-FX-only effects — Auto Pitch, Vocoder, Harmony, Gt Amp Sim — via [SHIFT]+[EXT SOURCE] → INPUT FX Setting). UI: FX Lab filters (category, difficulty, search), BUS/INPUT chips, detail page in the requested order (What it does · Parameters · Try this · Use it for · Trick · Practice) + related effects. `planned.fx` is now empty. **Not claimed:** which CTRL knob controls which parameter (the manual's tables don't say — the screen does); factory button assignments beyond FILTER+DRIVE / RESONATOR / ISOLATOR / DJFX LOOPER; audio examples (Phase 7).
* **Content:** one entry per SP-404MKII effect that can be **verified** in Roland's documentation (currently verified: DJFX Looper, Filter+Drive, Resonator, Isolator; todo: Delay, MFX, Cassette Sim, Vinyl Sim, Lo-fi, Tape Echo…). Presentation order exactly as requested: **WHAT IT DOES · CONTROLS · TRY THIS · USE IT FOR · TRICK · PRACTICE**; fields `name, category, difficulty, description, controls, goodFor[], lesson, exercise, tips[], relatedEffects[]`.
* **New files:** `content/fx/*.fx.json`, `src/screens/FxDetail` additions (TRICK / related effects), category filter.
* **Files changed:** `FxLab.tsx`, `FxDetail.tsx`, `content` conversion from Phase 3.
* **Tests:** the Phase-3 validator; effect names must match the manual's list (kept in a `fx-names.json` extracted from the manual with its URL).
* **Risks:** effect parameters differ by firmware → record `firmwareVersion`; **do not fabricate** controls for effects whose pages can't be read.
* **Dependencies:** Phase 3 (parallel with 4).
* **Acceptance:** each published effect has `verified` + sources; unverified effects appear only as a "planned" line, never as lessons.

### PHASE 6 — Expanded genre courses  ✅ delivered 2026-10-07
**Status:** 9 genre courses × 10 lessons = **90 lessons** in the requested structure (What makes it sound like this? · Drums · Groove · Bass · Chops/musical material · FX · Variation · Arrangement · Performance · Build a mini track): Footwork/Juke, Jungle, **Drum & Bass (now its own course)**, UK Garage / 2-Step, Breakbeat, Hip-Hop / Boom Bap, House, Techno, Ambient. Original patterns only; the step grid of each pattern is shown through `stepPattern`; hardware steps reuse the verified TR-REC / CHOP / MFX / Looper / chain procedures (sources cited per lesson); genre facts (eras, tempo ranges, defining traits) are written as `concept` steps. Courses live in the new tab *Genre deep-dives*; the earlier 13 interactive pattern courses stay under *Genre patterns* (unchanged, sidecar-built). New DnB symbol (`dnb.svg`). **Deviations:** the legacy `courses.py` was **not** converted into a data loader — the two systems coexist (the old one is interactive, with a live sequencer; the new one is data-driven). **Open:** owner/listening review of the genre claims and RU/EN wording; no audio examples (Phase 7).
* **Scope:** Footwork/Juke · Jungle · Drum & Bass · UK Garage/2-Step · Breakbeat · Hip-Hop · House · Techno · Ambient (priority) — each in the 10-lesson structure (What makes it sound like this? · Drums · Groove · Bass · Chops/musical material · FX · Variation · Arrangement · Performance · Build a complete mini-track), teaching genre logic, not just a preset. Existing 13 courses are kept; new/rewritten courses are original patterns (no copyrighted material), **Drum & Bass becomes its own course** (currently merged with Jungle) and a separate 2-Step module is added to UK Garage.
* **New files:** `content/courses/<genre>.course.json` + lessons; `python/translator/sp404/courses.py` becomes a thin loader (spec JSON → existing `build_course`).
* **Tests:** snapshot (old courses unchanged until edited), `test_every_course_builds_and_is_consistent` extended (10-lesson skeleton, voices have pads, steps in 1..16, both languages).
* **Risks:** genre-fact accuracy (BPM ranges, rhythmic claims) — mark `concept` and cite where a claim is non-obvious; owner/listening review of patterns.
* **Dependencies:** Phase 3. Genre taxonomy ids shared with Genre Engine (Phase 2/9) via `genre:` tags.
* **Acceptance:** each course has the 10-lesson structure, a final mini-track, original patterns, RU+EN, and passes the validator.

### PHASE 7 — Practice Mode  ✅ delivered 2026-10-07
**Status:** `src/lib/practice.ts` (pure logic: pattern-as-text `1--- ----`, visibility modes **SHOW ALL / HIDE STEPS / MEMORY** — memory hides 50 % → 75 % → all of the steps round by round —, time→step quantising, judging with a ±0.4-step tolerance, keyboard layout mirroring the unit, local stats; 12 tests), `lib/audio/practice.ts` (Web-Audio-clock engine: count-in, click, pattern playback, taps recorded minus output latency), `PracticePanel` (LISTEN → WATCH → COPY → PLAY, cued pads, step grid, result card with hit/extra/timing/missed), `Practice` screen + *Practice* tab in Courses (14 exercises in `content/exercises/`, difficulty-sorted, best score kept locally), "Practice →" button at the end of linked lessons (12 lessons link an exercise: the nine genre drum lessons, TR-REC, first beat, microtiming). Validator rules for exercises; end-to-end run checked in the browser (8/8 taps judged correctly). **MIDI is not implemented** — `PracticeInput` is the seam; the investigation, open questions and spike plan are in `HARDWARE_PRACTICE_PLAN.md`. **Open:** gate/hold exercises (needs note-off), a calibration step for tap latency, a no-sound (silent) visual-only mode for deaf/hard-of-hearing learners.
* **Design:** `PracticeSpec { voices: Record<voice, steps>; bpm; bars; modes }` rendered by a `PracticePanel` over the existing `StepSequencer`/`PadGrid`: **LISTEN** (synth plays, reuses `lib/audio/preview`) → **WATCH** (steps highlight in time) → **COPY** (pattern visible, user taps) → **PLAY**. Visibility modes: **SHOW ALL · HIDE STEPS · MEMORY** (progressive hiding by bar). Text rows such as `KICK 1--- ---- 1--- ----` for accessibility. Input adapter interface `PracticeInput { onHit(pad, t) }` with **pointer/keyboard implementation only**; scoring tolerance configurable.
* **New files:** `src/components/practice/{PracticePanel,PatternRow,usePractice}.ts(x)`, `src/lib/practice.ts` (modes, scoring), `content/exercises/*.exercise.json`, **`HARDWARE_PRACTICE_PLAN.md`** (future MIDI design; must first **investigate the SP-404MKII MIDI implementation** — no assumptions; user-visible "press pad 7 → ✓" flow only after verification).
* **Files changed:** `Tutorial.tsx` (exercise step type), `Transport` (practice loop).
* **Tests:** mode logic (hide/reveal), scoring, timing tolerance, a11y labels; no MIDI tests yet.
* **Risks:** web-audio timing on WebView; scope creep into MIDI (explicitly excluded).
* **Dependencies:** Phase 3; independent of analysis.
* **Acceptance:** a pattern exercise runs through LISTEN→WATCH→COPY→PLAY with the three visibility modes, keyboard/pointer input only; MIDI documented, not implemented.

### PHASE 8 — Track → Lesson ("Learn this track")  ✅ delivered 2026-10-07 (first version, on the current analysis)
**Status:** `src/lib/lessonPlan.ts` (`buildLessonPlan`: style, tempo, YOU WILL NEED, the 7 steps — build the rhythm · break variation / groove · bass · musical material · variation · FX · perform the arrangement — each with a *why*, facts "from your track", a caution when evidence is weak, and links into the Library: the genre's own lessons first, then generic ones, plus practice exercises and FX), `src/lib/explain.ts` (plain-language cards with confidence words: tempo, style, structure, drums, bass, vocals; numbers under DETAILS), `LearnThisTrack` screen (new sub-nav item *Learn track*; the old *Learn this track ▸* button on the Recipe now opens it, and its "step by step on this track's patterns" is the first item of step 1), explanation cards on the Track screen, **correction path** (change genre — also one-click options when the genre is hybrid —, ÷2 / ×2 / suggested BPM; the plan re-targets immediately), 14 tests (`lessonPlan.test.ts`). Checked on a real track (a DnB file → *Drum & Bass*, 175 BPM, drum-and-bass lessons first). **Deviations:** implemented in TypeScript, not Python — the Library lives in the front-end bundle and the plan needs the live correction state; the engine is untouched. **Deliberate limitation:** syncopation and four-on-the-floor are *not* turned into advice — measured on 58 real tracks they don't separate genres (syncopation 0.60–0.77 for 90 % of tracks; techno has the lowest four-on-the-floor score, 0.32) — see TRACK_ANALYSIS_V2_PLAN §8c; they stay under *Raw measurements (experimental)*. Tempo "confidence" is the genre-fit of the reading, not the engine's uncalibrated number. **Open:** break/groove claims need Drum V2 and the break analyser (A3–A4); no per-section lesson plans; no stored plan in the project file.
* **Design:** `LessonPlan` generated from `TrackUnderstanding` + existing SP Recipe (no second analysis): `{ style, tempo, youWillNeed[{kind,count}], steps[{title, source: libraryRef | generated, why}] }` — e.g. 01 Build the rhythm · 02 Create the break variation · 03 Add bass · 04 Add musical chops · 05 Create variation · 06 Add FX · 07 Perform the arrangement; wording is **"how to build something like this on your SP-404"**, never "copy this recording". Low-confidence items are phrased as "check by ear", never as instructions.
* **Explain the analysis:** `explain()` maps metrics → `{level, headline, body, tryThis, details}` (RU/EN) — "HIGH SYNCOPATION — important hits often fall between the beats. TRY THIS: move one kick to an off-beat 16th step." Technical numbers stay under DETAILS.
* **New files:** `python/translator/sp404/lessonplan.py`, `python/translator/sp404/explain.py`, `src/screens/LearnThisTrack.tsx`, `src/components/ExplainCard.tsx`, tests.
* **Files changed:** `recipe.py`/`tutorial.py` (consume confidence + corrections), `Track.tsx`/`Recipe.tsx` (explanations, link), sidecar `lesson_plan`.
* **Tests:** plan from fixture analyses (v1 and v2), low-confidence handling, EN/RU, correction affects plan.
* **Risks:** depends on analysis quality → gated by confidence; wording must not imply copying.
* **Dependencies:** A1 (schema), A8 (fusion/confidence) for full value; a reduced version can ship earlier on v1 data.
* **Acceptance:** after analysing a track the user gets a lesson plan whose every instruction is backed by `confidence ≥ MEDIUM`, a visible "change genre / BPM" correction path, and explanations instead of raw numbers.

### PHASE 9 — Genre-based recommendations and search
* **Recommendations:** `recommend(genre, difficulty, history)` over the library index using `genre:` and `skill:` tags (e.g. UK Garage → "UK Garage basics", "How to program 2-step", "Swing & shuffle", "Vocal chop tricks"). **CHANGE GENRE** control on Track Lab updates the project immediately, drives recommendations, and appends to the local corrections dataset (JSONL; no auto-retraining). Never locks the user in.
* **Search:** unified client-side index (`src/lib/search.ts`) over title/summary/tags/steps in the current language, prefix + token scoring; results grouped COURSE · LESSON · TRICK · REFERENCE · FX; queries like "resample", "vocal chop", "jungle", "DJFX", "bass". Generalises today's `searchReference`.
* **New files:** `src/lib/{search,recommend}.ts`, `src/screens/Search.tsx` (or Home search bar), `src/components/ChangeGenre.tsx`, `python/engine/corrections.py` (JSONL store), tests.
* **Files changed:** `Track.tsx`, `HomeLearn.tsx`, `Reference.tsx`, sidecar (`save_correction`).
* **Tests:** ranking examples, bilingual search, recommendation by genre/difficulty, correction persistence, privacy (local only).
* **Risks:** search relevance; correction UX.
* **Dependencies:** Phases 3–6 (content), 2 (genre), 8 (plan).
* **Acceptance:** each of the example queries returns relevant mixed-type results in both languages; changing the genre immediately changes recommendations; corrections are stored separately from raw predictions.

**Status:** `src/lib/search.ts` (token AND-search, light EN/RU stemming, weights title 6 > tags 3.5 > summary 3 > FX/reference terms 2 > steps 1, the other language weakly so "vocal chop" works in a Russian UI; results grouped COURSE · LESSON · TRICK · REFERENCE · FX · PRACTICE), top-bar search box (`/` focuses it, Esc closes) + `SearchScreen`; `src/lib/recommend.ts` (curated, validated picks for 13 genres; finished lessons sink; a newcomer under 50 % of the beginner path gets one basics lesson first; no genre → beginner list) shown on Home (genre of the open track, else beginner list) and inside `GenreCard`, where it **re-ranks the moment "Change genre" is used**. Corrections: genre (`genre_user` beside `genre`, appended to `genre.jsonl`) and now **BPM** (`TrackAnalysis.corrections.bpm = {raw, user}`, first raw reading kept; appended to `bpm.jsonl`) — raw and user values never merged, nothing retrains automatically. Tests: `search.test.ts` (14: example queries in RU, plus "vocal chop"/"resample"/"jungle"/"DJFX"/"bass" findable, recommend changes with genre, ids exist), `test_genre.py` (+1). **Deviations:** no `difficulty` argument (the lists are curated, ordered easy → hard); no history-based ranking beyond done/not done. **Open:** relevance is judged on example queries only, no usage data; the curated lists are my editorial choice and need the owner's review; reference results open the Reference screen, not the single entry.

---

## 6. Dependency graph and suggested order

```
Phase 1 ✔ ─► (owner data + D1) ─► A1 stage cache ─► Phase 2 genre ─► A8 fusion/confidence ─┐
Phase 3 data model ─► Phase 4 beginner ─┬► Phase 5 FX Lab                                    ├► Phase 8 Track→Lesson ─► Phase 9 recs/search
                                         └► Phase 6 genre courses ─► Phase 7 practice ─────────┘
```
Two independent tracks (analysis/genre vs. content) can proceed in parallel after approval. **Recommended first implementation steps:** Phase 3 (no external dependencies, unlocks 4–7) and A1 (infrastructure that lowers the risk of everything analysis-related).

## 7. Open decisions (stop for approval)

1. Approve this plan and phase order.
2. **D1:** optional "Genre Pack" with CC BY-NC-SA Discogs-EffNet weights (downloaded on user request, licence shown) — yes/no.
3. Provide a **private labelled set** (≥ 5 tracks per target genre; BPM/key/sections/drums where known).
4. Rename `status: todo` → `verification.status: needs_review` and move to the richer `verification` object (mechanical migration).
5. Content volume for the first content release (suggested: FROM ZERO 22 lessons + 16 intermediate + ~35 tricks + the verifiable FX) and who reviews RU/EN wording and hardware verification.
6. Stereo stem cache and Beat This! as a candidate dependency (see `MODEL_RESEARCH.md` §11).
