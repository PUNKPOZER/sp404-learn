# DESIGN_IMPLEMENTATION_PLAN — SP-404 LEARN × SP SYSTEM

Scope: redesign **SP-404 LEARN** around six areas (HOME · COURSES · FX LAB · TRICKS · TRACK LAB · REFERENCE) in the **SP SYSTEM** visual language,
without touching the Python analysis engine, the Tauri/Rust architecture, `.sp404learn` projects or the course engine.
Source of truth: `PROJECT_AUDIT.md` (read in full and compared with the tree at `dc7c464`) and the code. Branch: `design/sp-system`.
SP404 DROP is a separate repository; its SP SYSTEM work is parked on its own branch and is not touched here.

## 0. Inputs and decisions
- **Brand symbol**: `design-reference/brand-logo.svg` = the supplied `LOGO.svg` (single path, `fill="#F4F4F4"`), copied byte-for-byte. A runtime copy lives in
  `src/assets/brand-logo.svg` (identical bytes); the app injects it with only the `fill` replaced by `currentColor`. The geometry is never edited.
- **Verified-content rule** (new, from the brief): no SP-404MKII button combination appears in the UI unless it was checked against Roland's official
  *SP-404MK2 Reference Manual* (static.roland.com). Every content item carries `status` (`verified` | `todo`), a `source` URL and a `verifiedOn` date. `todo` items are
  **never rendered as lessons/cards** (a single text line lists planned topics).
- **Correction discovered while verifying**: the existing track-tutorial text used `PTN SEQ` / `TR-REC` as button names. The manual's TR-REC procedure uses
  `[PATTERN SELECT]`, `[REC]`, `[REMAIN]`, `[SUB PAD]`, pads 1–16 = steps. `python/translator/sp404/text.py` / `tutorial.py` / the course kit lessons are updated to the verified wording
  (text only; no logic change; tests updated).
- No `/design-reference/` folder existed besides the logo; the brief's written direction is the reference.

## 1. Files to create
| File | Purpose |
|---|---|
| `design-reference/brand-logo.svg`, `src/assets/brand-logo.svg` | Brand symbol (verbatim) |
| `src/styles/tokens.css` | SP SYSTEM tokens (`--sp-*`): palette, spacing, radius, borders, type, control, pad, motion, z-index, focus |
| `src/assets/genres/*.svg` | One editable vector per genre (footwork, jungle, ukgarage, hiphop, house, techno, breakbeat, ambient, triphop, lofihouse, lofihiphop) |
| `src/components/BrandMark.tsx` | Cow-on-chair via the supplied SVG |
| `src/components/GenreArt.tsx` | Inline genre SVG (`currentColor`), course→art mapping |
| `src/components/PadGrid.tsx` | The one canonical 4×4 pad grid (selected / active / highlighted / labels / bank / step state) — `SP404PadGrid` becomes a thin wrapper |
| `src/components/DeviceDiagram.tsx` | Simplified vector SP-404MKII (display, CTRL knobs, VALUE, key buttons, 16 pads) with `highlightPads` / `highlightControls` |
| `src/components/Knob.tsx` | Shared rotary control language (concept knobs for FX Lab) |
| `src/content/{fx,tricks,reference}.ts` + `types.ts` | Typed content models with `status`/`source`; initial **verified** entries only |
| `src/lib/progress.ts` | Real lesson-progress persistence (localStorage, try/catch) used by "Continue learning" |
| `src/screens/{HomeLearn,Courses,FxLab,FxDetail,Tricks,TrickDetail,Reference,TrackLabHome}.tsx` | New areas |
| `src/**/*.test.ts` | Vitest: content integrity (verified-only rendering), progress, search, pad mapping |
| `scripts/make-icons.py` | Rasterise the brand path → PNGs (16…1024) → `npx tauri icon` (numpy only) |
| `DESIGN_SYSTEM.md`, `SP_SYSTEM_INTERCHANGE.md` | Docs |

## 2. Files to change
`src/styles.css` (re-skin on tokens: paper/ink, restrained radii, no gradients/glow, hardware motion, reduced-motion), `src/state/store.ts` + `actions.ts` (new screens, progress; no behaviour change to analysis/recipe/projects),
`src/App.tsx`, `components/Sidebar.tsx` (six areas; Track Lab sub-navigation), `components/Logo.tsx` (cow), `components/Transport.tsx`/`Inspector.tsx`/`Tour.tsx` (styling only; tour copy updated for the new IA),
`components/{StepSequencer,Waveform,ArrangementStrip,ChopPanel}.tsx` + `screens/*` (colours from tokens; labels so colour is never the only cue),
`lib/voices.ts`, `lib/sections.ts` (restricted palette), `screens/Tutorial.tsx` (lesson view: course/lesson/progress, step list, device diagram), `screens/Settings.tsx` (styling),
`lib/tours.ts`, `src-tauri/tauri.conf.json` + `src-tauri/icons/*` (new icon), `python/translator/sp404/{text,tutorial,courses}.py` + tests (verified wording only), README/ARCHITECTURE/ROADMAP.

## 3. Preserved (behaviour must not change)
Python engine (`engine/`, `translator/` logic), sidecar RPC, Rust shell, analysis pipeline + cache, Demucs integration, drums/bass/structure editing, SP Recipe generation, track tutorials,
**course engine and all nine courses' content/logic**, chop planning/export, project save/open (`.sp404learn`, schema `version: 1`), tours mechanism, packaging path (PyInstaller sidecar + Tauri), CI workflow.

## 4. Migration order (each step: typecheck + lint + tests + browser smoke; one commit per step)
1. Tokens + paper/ink re-skin of `styles.css`; brand mark; Logo. (analysis screens keep working untouched structurally)
2. Canonical `PadGrid`; recolour `StepSequencer`, `Waveform`, lanes, strips from tokens; voice/section palette restriction.
3. Genre SVG assets + `GenreArt`.
4. IA: new store screens, Sidebar (six areas), Track Lab shell around the existing screens, HOME + COURSES with real progress.
5. `DeviceDiagram` + `Knob`; lesson view (Tutorial) redesign using them.
6. Content models + verified initial content; FX LAB, TRICKS, REFERENCE (reusing the tutorial renderer for "Try this" steps).
7. Verified-wording fix in Python tutorial text (+ tests).
8. Icons (render, compare ink/red vs ink/paper at 16–512 px, pick), Tauri icon assets.
9. Docs (`DESIGN_SYSTEM.md`, `SP_SYSTEM_INTERCHANGE.md`), tour copy, README.
10. Verification: learning workflow and track-analysis workflow in the browser dev bridge **and** the real Tauri app (autotest hook), Python/Vitest suites, `tauri build` smoke.

## 5. Risks
| Risk | Mitigation |
|---|---|
| Re-skin breaks layouts of dense analysis screens | Restyle via tokens/classes only; screenshot every screen; no structural edits to analysis screens beyond nav shell |
| Content errors in FX/Tricks | Only manual-verified entries render; `source` + `verifiedOn` stored; unit test fails the build if a `verified` item lacks a Roland URL |
| Brand SVG altered | Byte-compare test between `design-reference/` and `src/assets/` |
| Genre art inconsistent | One canvas (200×200), fixed stroke weight, `currentColor`, review sheet rendered and inspected |
| Palette restriction hurts legibility (many voices) | Row labels + shape/hatch patterns; colour never the only cue |
| Icon unreadable at 16 px | Render both variants at all sizes and inspect before choosing |
| Progress storage unavailable | try/catch + in-memory fallback; UI works without it |
| Scope creep into engine | No Python logic changes except the verified text strings |

## 6. Rollback
Everything on `design/sp-system` in small commits; `main` and tag `v0.2.0` (released DMG) untouched. Roll back one step with `git revert <commit>` or drop the branch.
Content/text corrections are isolated in `text.py`/`tutorial.py` commits.

## 7. Explicitly NOT changed
Python analysis algorithms; sidecar protocol; cache format/version; `.sp404learn` schema and extension; course specs' pattern data; Tauri permissions/CSP model;
bundle identifier; release/tag scheme; the DROP repository. No framework change, no cloud/account features, no new project format, no DROP converter duplicated in LEARN.
